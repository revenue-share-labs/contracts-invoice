// SPDX-License-Identifier: BSL 1.1

pragma solidity 0.8.20;

error CantAcceptEtherDirectly();

contract MockReceiver {

    receive() external payable {
        revert CantAcceptEtherDirectly();
    }

    constructor() {}
}
