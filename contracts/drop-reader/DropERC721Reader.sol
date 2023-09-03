// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

/// @author rarible

//    /$$$$$$$                      /$$ /$$       /$$
//    | $$__  $$                    |__/| $$      | $$
//    | $$  \ $$  /$$$$$$   /$$$$$$  /$$| $$$$$$$ | $$  /$$$$$$
//    | $$$$$$$/ |____  $$ /$$__  $$| $$| $$__  $$| $$ /$$__  $$
//    | $$__  $$  /$$$$$$$| $$  \__/| $$| $$  \ $$| $$| $$$$$$$$
//    | $$  \ $$ /$$__  $$| $$      | $$| $$  | $$| $$| $$_____/
//    | $$  | $$|  $$$$$$$| $$      | $$| $$$$$$$/| $$|  $$$$$$$
//    |__/  |__/ \_______/|__/      |__/|_______/ |__/ \_______/


//  ==========  External imports    ==========

import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

import "../eip/ERC721AVirtualApproveUpgradeable.sol";

//  ==========  Internal imports    ==========

import "../openzeppelin-presets/metatx/ERC2771ContextUpgradeable.sol";
import "../lib/CurrencyTransferLib.sol";

//  ==========  Features    ==========

import "../extension/ContractMetadata.sol";
import "../extension/PlatformFee.sol";
import "../extension/Royalty.sol";
import "../extension/PrimarySale.sol";
import "../extension/Ownable.sol";
import "../extension/DelayedReveal.sol";
import "../extension/LazyMint.sol";
import "../extension/PermissionsEnumerable.sol";
import "../extension/Drop.sol";
import "../extension/interface/IClaimCondition.sol";
import "../extension/interface/IClaimConditionMultiPhase.sol";

// OpenSea operator filter
import "../extension/DefaultOperatorFiltererUpgradeable.sol";

import "../drop/DropERC721.sol";
import "hardhat/console.sol";
import "../eip/interface/IERC20.sol";

contract DropERC721Reader {

    struct GlobalData {
        uint256 totalMinted;
        uint256 claimedByUser;
        uint256 totalSupply;
        uint256 maxTotalSupply;
        uint256 nextTokenIdToMint;
        uint256 nextTokenIdToClaim;
        string name;
        string symbol;
        string contractURI;
        uint256 baseURICount;
        uint256 userBalance;
        uint256 blockTimeStamp;
    }

    address public constant NATIVE1 = 0x0000000000000000000000000000000000000000;
    address public constant NATIVE2 = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    constructor() {

    }

    function getAllData(
        address _dropERC721,
        address _claimer
    ) public view returns (
        uint256 activeClaimConditionIndex,
        IClaimCondition.ClaimCondition[] memory conditions,
        GlobalData memory globalData
        ) {
        DropERC721 drop = DropERC721(_dropERC721);

        (uint256 startConditionIndex,uint256 stopConditionIndex)  = drop.claimCondition();
        uint256 _claimedByUser = 0;
        if(stopConditionIndex != 0) {
            try drop.getActiveClaimConditionId() returns (uint256 _activeClaimConditionIndex) {
                activeClaimConditionIndex = _activeClaimConditionIndex;
            } catch {
                activeClaimConditionIndex = 0;
            }
            conditions = new IClaimCondition.ClaimCondition[](stopConditionIndex);
            
            for (uint i = 0; i < stopConditionIndex; i++) {
                IClaimCondition.ClaimCondition memory condition = drop.getClaimConditionById(i);
                conditions[i] = condition;
            }
        }

        DropERC721Reader.GlobalData memory _globalData;
        if(stopConditionIndex > 0) {
            _claimedByUser = drop.getSupplyClaimedByWallet(activeClaimConditionIndex, _claimer);
            IClaimCondition.ClaimCondition memory condition = drop.getClaimConditionById(activeClaimConditionIndex);
            if(condition.currency == NATIVE1 || condition.currency == NATIVE2) {
                _globalData.userBalance = _claimer.balance;
            } else {
                _globalData.userBalance = IERC20(condition.currency).balanceOf(_claimer);
            }

        }

        _globalData.totalMinted = drop.totalMinted();
        _globalData.claimedByUser = _claimedByUser;
        _globalData.totalSupply = drop.totalSupply();
        _globalData.maxTotalSupply = drop.maxTotalSupply();
        _globalData.nextTokenIdToMint = drop.nextTokenIdToMint();
        _globalData.nextTokenIdToClaim = drop.nextTokenIdToClaim();
        _globalData.name = drop.name();
        _globalData.symbol = drop.symbol();
        _globalData.contractURI = drop.contractURI();
        _globalData.baseURICount = drop.getBaseURICount();
        _globalData.blockTimeStamp = block.timestamp;
        return (activeClaimConditionIndex, conditions, _globalData);
    }
}