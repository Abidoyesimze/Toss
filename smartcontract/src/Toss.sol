// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Toss — send USDC with a link
/// @notice A sender locks USDC to a one-time `claimKey` address. Whoever holds the matching
///         private key (carried in the link) signs a claim naming a recipient; any relayer can
///         submit it and is reimbursed a capped fee out of the deposit. The sender can refund
///         an unclaimed deposit at any time.
/// @dev On Arc, use the USDC ERC-20 interface (6 decimals), never the 18-decimal native balance.
contract Toss is EIP712 {
    using SafeERC20 for IERC20;

    struct Deposit {
        address sender;
        uint96 amount;
        uint64 expiry;
    }

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(address claimKey,address recipient,uint96 fee,uint64 deadline)");

    uint64 public constant MIN_DURATION = 1 hours;
    uint64 public constant MAX_DURATION = 30 days;

    IERC20 public immutable usdc;
    uint96 public immutable maxFee;
    uint96 public immutable minDeposit;

    mapping(address claimKey => Deposit) public deposits;
    mapping(address claimKey => bool) public used;

    event Deposited(address indexed claimKey, address indexed sender, uint96 amount, uint64 expiry);
    event Claimed(address indexed claimKey, address indexed recipient, address indexed relayer, uint96 amount, uint96 fee);
    event Refunded(address indexed claimKey, address indexed sender, uint96 amount);

    error KeyAlreadyUsed();
    error InvalidClaimKey();
    error AmountTooSmall();
    error InvalidExpiry();
    error NoDeposit();
    error Expired();
    error DeadlinePassed();
    error FeeTooHigh();
    error InvalidRecipient();
    error InvalidSignature();
    error NotSender();

    constructor(IERC20 usdc_, uint96 maxFee_, uint96 minDeposit_) EIP712("Toss", "1") {
        require(maxFee_ < minDeposit_, "fee >= min deposit");
        usdc = usdc_;
        maxFee = maxFee_;
        minDeposit = minDeposit_;
    }

    /// @notice Lock `amount` USDC to `claimKey` until `expiry`. Requires prior `approve`.
    function deposit(address claimKey, uint96 amount, uint64 expiry) external {
        if (claimKey == address(0)) revert InvalidClaimKey();
        if (used[claimKey]) revert KeyAlreadyUsed();
        if (amount < minDeposit) revert AmountTooSmall();
        if (expiry < block.timestamp + MIN_DURATION || expiry > block.timestamp + MAX_DURATION) {
            revert InvalidExpiry();
        }

        used[claimKey] = true;
        deposits[claimKey] = Deposit({sender: msg.sender, amount: amount, expiry: expiry});

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(claimKey, msg.sender, amount, expiry);
    }

    /// @notice Release a deposit to `recipient`, paying `fee` to the caller (the relayer).
    /// @param sig EIP-712 signature over Claim(claimKey, recipient, fee, deadline) by `claimKey`.
    function claim(address claimKey, address recipient, uint96 fee, uint64 deadline, bytes calldata sig) external {
        Deposit memory d = deposits[claimKey];
        if (d.sender == address(0)) revert NoDeposit();
        if (block.timestamp >= d.expiry) revert Expired();
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (fee > maxFee) revert FeeTooHigh();
        if (recipient == address(0) || recipient == address(this)) revert InvalidRecipient();

        bytes32 digest =
            _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, claimKey, recipient, fee, deadline)));
        if (ECDSA.recover(digest, sig) != claimKey) revert InvalidSignature();

        delete deposits[claimKey];

        uint96 payout = d.amount - fee; // fee <= maxFee < minDeposit <= amount
        usdc.safeTransfer(recipient, payout);
        if (fee > 0) usdc.safeTransfer(msg.sender, fee);

        emit Claimed(claimKey, recipient, msg.sender, payout, fee);
    }

    /// @notice Return an unclaimed deposit to its sender. Allowed at any time, before or after expiry.
    function refund(address claimKey) external {
        Deposit memory d = deposits[claimKey];
        if (d.sender == address(0)) revert NoDeposit();
        if (d.sender != msg.sender) revert NotSender();

        delete deposits[claimKey];

        usdc.safeTransfer(d.sender, d.amount);
        emit Refunded(claimKey, d.sender, d.amount);
    }

    /// @notice EIP-712 digest a claim key must sign; exposed for off-chain tooling and tests.
    function claimDigest(address claimKey, address recipient, uint96 fee, uint64 deadline)
        external
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, claimKey, recipient, fee, deadline)));
    }
}
