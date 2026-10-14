// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Toss} from "../src/Toss.sol";
import {MockUSDC} from "../test/mocks/MockUSDC.sol";

/// Local anvil deploy with a mock USDC; mints 1,000 USDC to the first anvil account.
///   forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
///     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
contract DeployLocal is Script {
    function run() external returns (Toss toss, MockUSDC usdc) {
        vm.startBroadcast();
        usdc = new MockUSDC();
        toss = new Toss(IERC20(address(usdc)), 50_000, 1_000_000);
        usdc.mint(msg.sender, 1_000_000_000);
        vm.stopBroadcast();
        console.log("MockUSDC", address(usdc));
        console.log("Toss", address(toss));
    }
}
