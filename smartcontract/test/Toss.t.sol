// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Toss} from "../src/Toss.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract TossTest is Test {
    Toss toss;
    MockUSDC usdc;

    uint96 constant MAX_FEE = 50_000; // 0.05 USDC
    uint96 constant MIN_DEPOSIT = 1_000_000; // 1 USDC
    uint96 constant AMOUNT = 25_000_000; // 25 USDC

    address sender = makeAddr("sender");
    address recipient = makeAddr("recipient");
    address relayer = makeAddr("relayer");
    address attacker = makeAddr("attacker");

    uint256 claimPk;
    address claimKey;
    uint64 expiry;

    function setUp() public {
        usdc = new MockUSDC();
        toss = new Toss(IERC20(address(usdc)), MAX_FEE, MIN_DEPOSIT);
        (claimKey, claimPk) = makeAddrAndKey("claimKey");
        expiry = uint64(block.timestamp + 7 days);

        usdc.mint(sender, 1_000_000_000);
        vm.prank(sender);
        usdc.approve(address(toss), type(uint256).max);
    }

    // ---------- helpers ----------

    function _deposit() internal {
        vm.prank(sender);
        toss.deposit(claimKey, AMOUNT, expiry);
    }

    function _sign(uint256 pk, address key, address to, uint96 fee, uint64 deadline) internal view returns (bytes memory) {
        bytes32 digest = toss.claimDigest(key, to, fee, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _deadline() internal view returns (uint64) {
        return uint64(block.timestamp + 10 minutes);
    }

    // ---------- deposit ----------

    function test_Deposit() public {
        _deposit();
        (address s, uint96 a, uint64 e) = toss.deposits(claimKey);
        assertEq(s, sender);
        assertEq(a, AMOUNT);
        assertEq(e, expiry);
        assertEq(usdc.balanceOf(address(toss)), AMOUNT);
        assertTrue(toss.used(claimKey));
    }

    function test_Deposit_RevertsOnReusedKey() public {
        _deposit();
        vm.prank(sender);
        vm.expectRevert(Toss.KeyAlreadyUsed.selector);
        toss.deposit(claimKey, AMOUNT, expiry);
    }

    function test_Deposit_RevertsBelowMinimum() public {
        vm.prank(sender);
        vm.expectRevert(Toss.AmountTooSmall.selector);
        toss.deposit(claimKey, MIN_DEPOSIT - 1, expiry);
    }

    function test_Deposit_RevertsOnBadExpiry() public {
        vm.startPrank(sender);
        vm.expectRevert(Toss.InvalidExpiry.selector);
        toss.deposit(claimKey, AMOUNT, uint64(block.timestamp + 30 minutes));
        vm.expectRevert(Toss.InvalidExpiry.selector);
        toss.deposit(claimKey, AMOUNT, uint64(block.timestamp + 31 days));
        vm.stopPrank();
    }

    function test_Deposit_RevertsOnZeroKey() public {
        vm.prank(sender);
        vm.expectRevert(Toss.InvalidClaimKey.selector);
        toss.deposit(address(0), AMOUNT, expiry);
    }

    // ---------- claim ----------

    function test_Claim_HappyPath() public {
        _deposit();
        uint96 fee = 2_000;
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, fee, deadline);

        vm.prank(relayer);
        toss.claim(claimKey, recipient, fee, deadline, sig);

        assertEq(usdc.balanceOf(recipient), AMOUNT - fee);
        assertEq(usdc.balanceOf(relayer), fee);
        assertEq(usdc.balanceOf(address(toss)), 0);
        (address s,,) = toss.deposits(claimKey);
        assertEq(s, address(0));
    }

    function test_Claim_ZeroFee() public {
        _deposit();
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, 0, deadline);
        vm.prank(relayer);
        toss.claim(claimKey, recipient, 0, deadline, sig);
        assertEq(usdc.balanceOf(recipient), AMOUNT);
        assertEq(usdc.balanceOf(relayer), 0);
    }

    function test_Claim_RevertsOnWrongSigner() public {
        _deposit();
        (, uint256 otherPk) = makeAddrAndKey("other");
        uint64 deadline = _deadline();
        bytes memory sig = _sign(otherPk, claimKey, recipient, 0, deadline);
        vm.expectRevert(Toss.InvalidSignature.selector);
        toss.claim(claimKey, recipient, 0, deadline, sig);
    }

    function test_Claim_RevertsOnReplay() public {
        _deposit();
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, 0, deadline);
        toss.claim(claimKey, recipient, 0, deadline, sig);
        vm.expectRevert(Toss.NoDeposit.selector);
        toss.claim(claimKey, recipient, 0, deadline, sig);
    }

    /// Front-running: a copied signature cannot redirect funds to a different recipient.
    function test_Claim_RevertsOnChangedRecipient() public {
        _deposit();
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, 0, deadline);
        vm.prank(attacker);
        vm.expectRevert(Toss.InvalidSignature.selector);
        toss.claim(claimKey, attacker, 0, deadline, sig);
    }

    /// A relayer cannot raise the fee above what the claim key signed.
    function test_Claim_RevertsOnChangedFee() public {
        _deposit();
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, 1_000, deadline);
        vm.expectRevert(Toss.InvalidSignature.selector);
        toss.claim(claimKey, recipient, 2_000, deadline, sig);
    }

    function test_Claim_RevertsOnFeeAboveCap() public {
        _deposit();
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, MAX_FEE + 1, deadline);
        vm.expectRevert(Toss.FeeTooHigh.selector);
        toss.claim(claimKey, recipient, MAX_FEE + 1, deadline, sig);
    }

    function test_Claim_RevertsAfterExpiry() public {
        _deposit();
        vm.warp(expiry);
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, 0, deadline);
        vm.expectRevert(Toss.Expired.selector);
        toss.claim(claimKey, recipient, 0, deadline, sig);
    }

    function test_Claim_RevertsAfterDeadline() public {
        _deposit();
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, 0, deadline);
        vm.warp(deadline + 1);
        vm.expectRevert(Toss.DeadlinePassed.selector);
        toss.claim(claimKey, recipient, 0, deadline, sig);
    }

    function test_Claim_RevertsOnZeroRecipient() public {
        _deposit();
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, address(0), 0, deadline);
        vm.expectRevert(Toss.InvalidRecipient.selector);
        toss.claim(claimKey, address(0), 0, deadline, sig);
    }

    function test_Claim_RevertsAfterRefund() public {
        _deposit();
        vm.prank(sender);
        toss.refund(claimKey);
        uint64 deadline = _deadline();
        bytes memory sig = _sign(claimPk, claimKey, recipient, 0, deadline);
        vm.expectRevert(Toss.NoDeposit.selector);
        toss.claim(claimKey, recipient, 0, deadline, sig);
    }

    /// Signature made for another Toss deployment (different verifying contract) is rejected.
    function test_Claim_RevertsOnOtherContractSignature() public {
        Toss other = new Toss(IERC20(address(usdc)), MAX_FEE, MIN_DEPOSIT);
        _deposit();
        uint64 deadline = _deadline();
        bytes32 digest = other.claimDigest(claimKey, recipient, 0, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimPk, digest);
        vm.expectRevert(Toss.InvalidSignature.selector);
        toss.claim(claimKey, recipient, 0, deadline, abi.encodePacked(r, s, v));
    }

    /// Signature made for another chain ID is rejected.
    function test_Claim_RevertsOnOtherChainSignature() public {
        _deposit();
        uint64 deadline = _deadline();
        uint256 originalChain = block.chainid;
        vm.chainId(1);
        bytes memory sig = _sign(claimPk, claimKey, recipient, 0, deadline);
        vm.chainId(originalChain);
        vm.expectRevert(Toss.InvalidSignature.selector);
        toss.claim(claimKey, recipient, 0, deadline, sig);
    }

    // ---------- refund ----------

    function test_Refund_BeforeExpiry() public {
        _deposit();
        uint256 before = usdc.balanceOf(sender);
        vm.prank(sender);
        toss.refund(claimKey);
        assertEq(usdc.balanceOf(sender), before + AMOUNT);
        assertEq(usdc.balanceOf(address(toss)), 0);
    }

    function test_Refund_AfterExpiry() public {
        _deposit();
        vm.warp(expiry + 1);
        vm.prank(sender);
        toss.refund(claimKey);
        assertEq(usdc.balanceOf(address(toss)), 0);
    }

    function test_Refund_RevertsForNonSender() public {
        _deposit();
        vm.prank(attacker);
        vm.expectRevert(Toss.NotSender.selector);
        toss.refund(claimKey);
    }

    function test_Refund_RevertsAfterClaim() public {
        _deposit();
        uint64 deadline = _deadline();
        toss.claim(claimKey, recipient, 0, deadline, _sign(claimPk, claimKey, recipient, 0, deadline));
        vm.prank(sender);
        vm.expectRevert(Toss.NoDeposit.selector);
        toss.refund(claimKey);
    }

    function test_Refund_KeyCannotBeReused() public {
        _deposit();
        vm.prank(sender);
        toss.refund(claimKey);
        vm.prank(sender);
        vm.expectRevert(Toss.KeyAlreadyUsed.selector);
        toss.deposit(claimKey, AMOUNT, expiry);
    }

    // ---------- fuzz ----------

    function testFuzz_ClaimConservesFunds(uint96 amount, uint96 fee, uint256 pkSeed, address to) public {
        amount = uint96(bound(amount, MIN_DEPOSIT, 1_000_000_000));
        fee = uint96(bound(fee, 0, MAX_FEE));
        uint256 pk = bound(pkSeed, 1, 1e70);
        vm.assume(to != address(0) && to != address(toss) && to != relayer && to != sender);
        address key = vm.addr(pk);

        vm.prank(sender);
        toss.deposit(key, amount, expiry);

        uint64 deadline = _deadline();
        bytes memory sig = _sign(pk, key, to, fee, deadline);
        uint256 toBefore = usdc.balanceOf(to);
        vm.prank(relayer);
        toss.claim(key, to, fee, deadline, sig);

        assertEq(usdc.balanceOf(to) - toBefore, amount - fee);
        assertEq(usdc.balanceOf(relayer), fee);
        assertEq(usdc.balanceOf(address(toss)), 0);
    }
}
