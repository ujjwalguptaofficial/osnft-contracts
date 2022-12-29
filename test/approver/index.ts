import { expect } from "chai";
import { ethers } from "hardhat";
import { IDeployedPayload } from "../interfaces";

export function testApprover(payload: IDeployedPayload) {

    it('isApprover', async () => {
        const tx = await payload.approver.isApprover(payload.deployer.address);
        await expect(tx).equal(false);
    })

    it('add approver', async () => {
        const tx = payload.approver.addApprover(payload.deployer.address);
        await expect(tx).emit(payload.approver, 'ApproverAdded').withArgs(
            payload.deployer.address
        );
    });

    it('add approver other than owner', async () => {
        const tx = payload.approver.connect(payload.signer2).addApprover(payload.deployer.address);

        await expect(tx).revertedWith('Ownable: caller is not the owner')
    });

    it('remove minter', async () => {
        let tx = payload.approver.addApprover(payload.signer2.address);

        await expect(tx).emit(payload.approver, 'ApproverAdded').withArgs(
            payload.signer2.address
        );

        tx = payload.approver.removeApprover(payload.signer2.address);

        await expect(tx).emit(payload.approver, 'ApproverRemoved').withArgs(
            payload.signer2.address
        );

    });

    it('remove minter other than owner', async () => {
        const tx = payload.approver.connect(payload.signer2).removeApprover(payload.deployer.address);

        await expect(tx).revertedWith('Ownable: caller is not the owner');
    });

    it('add project by user who is not approver', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const address = payload.deployer.address;

        const tx = payload.approver.connect(payload.signer4).approveProject({
            tokenId,
            mintTo: address,
            starCount: 0,
            forkCount: 0
        });
        await expect(tx).revertedWith('only approvers allowed');
    })

    it('add project estimate gas', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const address = payload.deployer.address;

        const tx = await payload.approver.estimateGas.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 0,
                forkCount: 0
            }
        );
        await expect(tx).equal(65628);
    })

    it('add project jsstore-example', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["jsstore-example"]
        );
        const address = payload.deployer.address;

        let approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 32,
                forkCount: 35
            }
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(address);
    })

    it('add project mahal-example', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["mahal-example"]
        );
        const address = payload.signer2.address;

        let approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 4,
                forkCount: 0
            }
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(address);
    })

    it('add project mahal', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["mahal"]
        );
        const address = payload.signer2.address;

        let approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 45,
                forkCount: 2
            }
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(address);
    })

    it('add project jsstore', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["jsstore"]
        );
        const address = payload.deployer.address;

        let approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 665,
                forkCount: 98
            }
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(address);
    })

    it('add project mahal webpack loader', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["mahal-webpack-loader"]
        );
        const address = payload.signer3.address;

        let approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 1,
                forkCount: 0
            }
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(address);
    })

    it('add project godam', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["godam"]
        );
        const address = payload.signer4.address;

        let approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 4,
                forkCount: 1
            }
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(address);
    })

    it('add project solidity-learning', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["solidity-learning"]
        );
        const address = payload.deployer.address;

        let approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 4,
                forkCount: 1
            }
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(address);
    })

    it('add project godam vue', async () => {
        const tokenId = payload.getProjectId(
            payload.projects["godam-vue"]
        );
        const address = payload.signer4.address;

        let approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(ethers.constants.AddressZero);

        const tx = payload.approver.approveProject(
            {
                tokenId,
                mintTo: address,
                starCount: 4,
                forkCount: 1
            }
        );
        await expect(tx).emit(payload.approver, "ProjectApproved").withArgs(
            tokenId, address
        )

        approvedValue = await payload.approver.getApprovedProject(
            tokenId
        );

        expect(approvedValue.mintTo).equal(address);
    })

}
