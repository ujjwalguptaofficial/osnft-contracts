import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IDeployedPayload } from "../interfaces";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";


export function testProjectTokenize(payload: IDeployedPayload) {

    const signMessageForProjectTokenize = async (user: SignerWithAddress, projectUrl: string, to: string, deadline: number) => {
        // const domainType = [
        //     { name: "name", type: "string" },
        //     { name: "version", type: "string" },
        //     { name: "chainId", type: "uint256" },
        //     { name: "verifyingContract", type: "address" },
        // ];
        const dataType = [
            { name: "projectUrl", type: "string" },
            { name: "creator", type: "address" },
            { name: "validUntil", type: "uint256" },
        ];

        const domainData = {
            name: "OSNFT",
            version: "1",
            chainId: await user.getChainId(),
            verifyingContract: payload.nft.address.toLowerCase(),
        };
        const message = {
            projectUrl: projectUrl,
            validUntil: deadline,
            creator: to
        };



        const signatureResult = await user._signTypedData(domainData, {
            ProjectTokenizeData: dataType,
        }, message);
        // recover


        return signatureResult;
    }

    it('expired signature', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() - 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.erc20Token1.address;
        const royality = 5;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);

        const signature = signMessageForProjectTokenize(payload.deployer, projectUrl, payload.deployer.address,
            timestamp
        );

        const tx = nft.tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to: payload.operator.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'SignatureExpired');
    })

    it('invalid signature with diff to', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.erc20Token1.address;
        const royality = 10;
        const projectUrl = payload.projects.jsstore;

        const signature = signMessageForProjectTokenize(payload.deployer, projectUrl, payload.deployer.address, timestamp
        );

        const tx = nft.tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to: payload.operator.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'InvalidSignature');
    })

    it('invalid signature with diff creator', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.erc20Token1.address;
        const royality = 10;
        const projectUrl = payload.projects.jsstore;

        const signature = signMessageForProjectTokenize(payload.deployer, projectUrl, payload.deployer.address, timestamp
        );

        const tx = nft.connect(payload.signer2).tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to: payload.deployer.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'InvalidSignature');
    })

    it('invalid signature with diff projectUrl', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.erc20Token1.address;
        const royality = 10;
        const projectUrl = payload.projects.jsstore;

        const signature = signMessageForProjectTokenize(payload.deployer, projectUrl, payload.deployer.address, timestamp
        );

        const tx = nft.connect(payload.signer2).tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl: payload.projects["godam-vue"],
            royality: royality
        }, {
            signature, to: payload.deployer.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'InvalidSignature');
    })

    it('royality greater than 10', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.erc20Token1.address;
        const royality = 11;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);

        const signature = signMessageForProjectTokenize(payload.deployer, projectUrl, payload.deployer.address, timestamp
        );

        const tx = nft.tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to: payload.deployer.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'RoyalityLimitExceeded');
    })

    it('by address not minters', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.erc20Token1.address;
        const royality = 10;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);

        const signature = signMessageForProjectTokenize(payload.signer4, projectUrl, payload.deployer.address, timestamp
        );

        const tx = nft.connect(payload.signer4).tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to: payload.signer4.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'RequireVerifier');
    })

    it('not allowed payment token', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.operator.address;
        const royality = 10;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);

        const signature = signMessageForProjectTokenize(payload.deployer, projectUrl, payload.deployer.address, timestamp
        );

        const tx = nft.connect(payload.deployer).tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to: payload.deployer.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'PaymentTokenNotAllowed');
    })

    it('success jsstore', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = ethers.utils.parseEther('100');
        const popularityFactorPrice = ethers.utils.parseEther('1');
        const paymentToken = payload.erc20Token1.address;
        const royality = 5;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);
        const to = payload.deployer.address;

        const projectInfoBefore = await nft.getProject(tokenId);

        expect(projectInfoBefore.paymentERC20Token).equal(ethers.constants.AddressZero);

        const signature = signMessageForProjectTokenize(payload.deployer, projectUrl, payload.deployer.address, timestamp
        );

        // allow payment token

        await payload.erc20Token1.approve(nft.address, ethers.constants.MaxUint256);

        const tx = nft.tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to, validUntil: timestamp
        });


        await expect(tx).to.emit(nft, "ProjectTokenize").withArgs(
            tokenId, to, basePrice, popularityFactorPrice, paymentToken, royality,
            projectUrl
        );

        const projectInfoAfter = await nft.getProject(tokenId);

        expect(projectInfoAfter.paymentERC20Token).equal(paymentToken);
        expect(projectInfoAfter.basePrice).equal(basePrice);
        expect(projectInfoAfter.popularityFactorPrice).equal(popularityFactorPrice);
        expect(projectInfoAfter.royality).equal(royality);
        expect(projectInfoAfter.tokenCount).equal(1);
        expect(projectInfoAfter.creator).equal(payload.deployer.address);
        expect(projectInfoAfter.treasuryTotalAmount).equal(0);
        expect(projectInfoAfter.lastMintPrice).equal(0);

        // balance of creator

        const balanceOfCreator = await nft.balanceOf(payload.deployer.address, tokenId);
        expect(balanceOfCreator).equal(1);

        // check for transfer events

        await expect(tx).to.emit(nft, 'TransferSingle').withArgs(
            payload.deployer.address, ethers.constants.AddressZero, payload.deployer.address, tokenId, 1
        );
    })

    it('minting again same project', async () => {
        const nft = payload.nft;
        const timestamp = await time.latest() + 1000;
        const basePrice = 100;
        const popularityFactorPrice = 1;
        const paymentToken = payload.erc20Token1.address;
        const royality = 5;
        const projectUrl = payload.projects.jsstore;
        const tokenId = payload.getProjectId(projectUrl);

        const signature = signMessageForProjectTokenize(payload.deployer, projectUrl, payload.deployer.address, timestamp
        );

        const tx = nft.tokenizeProject({
            basePrice: basePrice,
            paymentERC20Token: paymentToken,
            popularityFactorPrice: popularityFactorPrice,
            projectUrl,
            royality: royality
        }, {
            signature, to: payload.deployer.address, validUntil: timestamp
        });

        await expect(tx).revertedWithCustomError(nft, 'ProjectExist');
    })

}