// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Toss} from "../src/Toss.sol";

/// Arc mainnet deploy:
///   forge script script/Deploy.s.sol --rpc-url arc --account <keystore> --broadcast
contract Deploy is Script {
    IERC20 constant ARC_USDC = IERC20(0x3600000000000000000000000000000000000000);
    uint96 constant MAX_FEE = 50_000; // 0.05 USDC
    uint96 constant MIN_DEPOSIT = 1_000_000; // 1 USDC

    function run() external returns (Toss toss) {
        require(block.chainid == 5042, "not Arc mainnet");
        vm.startBroadcast();
        toss = new Toss(ARC_USDC, MAX_FEE, MIN_DEPOSIT);
        vm.stopBroadcast();
        console.log("Toss deployed at", address(toss));
    }
}
