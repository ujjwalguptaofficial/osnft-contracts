import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IDeployedPayload } from "../interfaces";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";


export function testBurn(payload: IDeployedPayload) {

    it('not owner', async () => {
        const nft = payload.nft;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const tx = nft.connect(payload.operator).burn(tokenId);

        await expect(tx).revertedWithCustomError(nft, 'RequireTokenOwner');
    })

    it('success by first investor', async () => {
        const nft = payload.nft.connect(payload.signer2);
        const owner = payload.signer2.address;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const projectInfoBefore = await nft.getProject(tokenId);
        const investedAmount = await nft.getInvestedAmount(tokenId, owner);
        const paymentTokenBalanceBefore = await payload.erc20Token1.balanceOf(owner);
        const returnAmount = projectInfoBefore.treasuryTotalAmount.div(projectInfoBefore.tokenCount);
        let profit = returnAmount.sub(investedAmount);
        // profit = profit.gt(0) ? profit : ethers.BigNumber.from(0);

        console.log("profit", profit.toString(), returnAmount.toString(), projectInfoBefore.treasuryTotalAmount.toString(), investedAmount.toString());

        const tx = nft.burn(tokenId);

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            owner, owner, ethers.constants.AddressZero, tokenId, 1
        );

        // balance should be zero
        const nftBalanceAfter = await nft.balanceOf(owner, tokenId);
        expect(nftBalanceAfter).equal(0);

        // check payment transfer to owner
        const contractEarning = payload.getPercentage(profit, 2);
        const paymentTokenBalanceAfter = await payload.erc20Token1.balanceOf(owner);
        expect(paymentTokenBalanceAfter).equal(
            paymentTokenBalanceBefore.add(returnAmount.sub(contractEarning))
        );

        // check treasure amount after
        const projectInfoAfter = await nft.getProject(tokenId);
        expect(projectInfoAfter.tokenCount).equal(projectInfoBefore.tokenCount.sub(1));
        expect(projectInfoAfter.treasuryTotalAmount).equal(projectInfoBefore.treasuryTotalAmount.sub(returnAmount));
    })

    it('exit again by first investor', async () => {
        const nft = payload.nft.connect(payload.signer2);
        const owner = payload.signer2.address;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const investedAmount = nft.getInvestedAmount(tokenId, owner);
        await expect(investedAmount).revertedWithCustomError(nft, 'RequireTokenOwner');

        const tx = nft.burn(tokenId);

        await expect(tx).revertedWithCustomError(nft, 'RequireTokenOwner');
    })

    it('success by last investor', async () => {
        const nft = payload.nft.connect(payload.signer4);
        const owner = payload.signer4.address;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const projectInfoBefore = await nft.getProject(tokenId);
        const investedAmount = await nft.getInvestedAmount(tokenId, owner);
        const paymentTokenBalanceBefore = await payload.erc20Token1.balanceOf(owner);
        const returnAmount = projectInfoBefore.treasuryTotalAmount.div(projectInfoBefore.tokenCount);
        let profit = returnAmount.sub(investedAmount);
        profit = profit.gt(0) ? profit : ethers.BigNumber.from(0);

        console.log("profit", profit.toString(), returnAmount.toString(), projectInfoBefore.treasuryTotalAmount.toString());

        const tx = nft.burn(tokenId);

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            owner, owner, ethers.constants.AddressZero, tokenId, 1
        );

        // balance should be zero
        const nftBalanceAfter = await nft.balanceOf(owner, tokenId);
        expect(nftBalanceAfter).equal(0);

        // check payment transfer to owner
        const contractEarning = payload.getPercentage(profit, 2);
        const paymentTokenBalanceAfter = await payload.erc20Token1.balanceOf(owner);
        expect(paymentTokenBalanceAfter).equal(
            paymentTokenBalanceBefore.add(returnAmount.sub(contractEarning))
        );

        // check treasure amount after
        const projectInfoAfter = await nft.getProject(tokenId);
        expect(projectInfoAfter.tokenCount).equal(projectInfoBefore.tokenCount.sub(1));
        expect(projectInfoAfter.treasuryTotalAmount).equal(projectInfoBefore.treasuryTotalAmount.sub(returnAmount));
    })
}