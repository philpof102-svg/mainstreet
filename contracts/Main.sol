// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Main — Mainstreet token (ERC-20 minimal, immutable)
 * @notice 1,000,000 MAIN minted at deploy to the Mainstreet operator wallet.
 *         No further mint, no admin, no upgrade path. Anyone can transfer.
 * @dev Pure inline ERC-20 (no OpenZeppelin import) so it deploys from Remix
 *      without any dependency setup. Same behavior as OZ ERC20.
 *      Deployed via Remix on Base mainnet (chain 8453).
 */
contract Main {
    string public constant name = "Mainstreet";
    string public constant symbol = "MAIN";
    uint8 public constant decimals = 18;
    uint256 public immutable totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @param mintReceiver address that receives the full initial supply
    /// @param supply       total supply in wei units (18 decimals)
    constructor(address mintReceiver, uint256 supply) {
        require(mintReceiver != address(0), "zero receiver");
        require(supply > 0, "zero supply");
        totalSupply = supply;
        balanceOf[mintReceiver] = supply;
        emit Transfer(address(0), mintReceiver, supply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        return _transfer(msg.sender, to, value);
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        return _transfer(from, to, value);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal returns (bool) {
        require(to != address(0), "zero to");
        require(balanceOf[from] >= value, "balance");
        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
        return true;
    }
}
