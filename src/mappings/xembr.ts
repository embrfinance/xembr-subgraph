import { BigInt, BigDecimal, Address, log } from '@graphprotocol/graph-ts';
import {
    Transfer,
    RewardAdded,
    RewardPaid,
    LogTokenAddition,
    LogTokenUpdate,
    Withdraw,
    Staked,
    Cooldown,
    CooldownExited
  } from '../types/xEmbrToken/xEmbrToken';
  import {
    XEmbr,
    XEmbrSnapshot,
    UserSnapshot,
    TokenSnapshot,
    UserReward,
    RewardToken,
    User,
  } from '../types/schema';
import {
  getTokenDecimals,
  tokenToDecimal,
  scaleDown,
  saveCooldownToSnapshots,
  getTokenSnapshot,
  getUserReward,
  getToken,
  getXEmbrSnapshot,
  getUserSnapshot,
  getUser,
  createToken,
  getXEmbr,
} from './helpers/misc';
import { MIN_VIABLE_LIQUIDITY, ONE_BD, ZERO, ZERO_BD, CooldownEvent, ZERO_ADDRESS } from "./helpers/constants";


export function handleLogTokenAddition(event: LogTokenAddition): void {
    let xembr = getXEmbr()

    let index =  event.params.rtid
    let address = event.params.rewardToken

    log.info('Token added: {} {}', [address.toHexString(), index.toString()]);


    let rewardToken = createToken(address, index)
    rewardToken.save()

    xembr.tokenCount++
    xembr.activeTokenCount++

    xembr.save()


}

export function handleStake(event: Staked): void {

    let xembr = getXEmbr()
    let xembrSnapshot = getXEmbrSnapshot(event)
    let userSnapshot = getUserSnapshot(event.params.user, event)

    log.info('handleStake: {} {}', [event.params.user.toHexString(), event.params.amount.toString()]);


    let user = getUser(event.params.user)

    let transferAmount = tokenToDecimal(event.params.amount, 18);


    xembrSnapshot.totalStaking = xembrSnapshot.totalStaking.plus(transferAmount)
    xembrSnapshot.save()


    if(user.staking.equals(ZERO_BD)){ 
        xembr.userCount += 1
    }
    xembr.totalStaking = xembr.totalStaking.plus(transferAmount)
    xembr.save()


    user.staking = user.staking.plus(transferAmount)
    user.save()

    userSnapshot.staking = user.staking.plus(transferAmount)
    userSnapshot.save()
}



export function handleTransfer(event: Transfer): void {
    let from = event.params.from
    let to = event.params.to
    let amount = event.params.value


    log.info('handleTransfer: {} {} {}', [from.toHexString(), to.toHexString(), amount.toString()]);


    let xembr = getXEmbr()
    let xembrSnapshot = getXEmbrSnapshot(event)

    let transferAmount = tokenToDecimal(amount, 18);

    if (from.toHex() == ZERO_ADDRESS || from.toHex() == "0x0000000000000000000000000000000000000000")  { 
        // mint
        let userSnapshot = getUserSnapshot(to, event)
        let user = getUser(to)

        xembrSnapshot.totalXembr = xembrSnapshot.totalXembr.plus(transferAmount)
        xembrSnapshot.save()

        xembr.totalXembr = xembr.totalXembr.plus(transferAmount)
        xembr.save()

        user.totalXembr = user.totalXembr.plus(transferAmount)
        user.save()
    
        userSnapshot.totalXembr = user.totalXembr.plus(transferAmount)
        userSnapshot.save()

    } else { 
        // remove
        let userSnapshot = getUserSnapshot(from, event)
        let user = getUser(from)

        xembrSnapshot.totalXembr = xembrSnapshot.totalXembr.minus(transferAmount)
        xembrSnapshot.save()

        xembr.totalXembr = xembr.totalXembr.minus(transferAmount)
        xembr.save()

        user.totalXembr = user.totalXembr.minus(transferAmount)
        user.save()
    
        userSnapshot.totalXembr = user.totalXembr.minus(transferAmount)
        userSnapshot.save()

    }
}

export function handleCooldown(event: Cooldown): void {
    
    const units = event.params.percentage
    const userAddr = event.params.user

    let transferAmount = tokenToDecimal(units, 18);

    let xembr = getXEmbr()
    let xembrSnapshot = getXEmbrSnapshot(event)

    let userSnapshot = getUserSnapshot(userAddr, event)
    let user = getUser(userAddr)

    xembr.totalCooling =  xembr.totalCooling.plus(transferAmount)
    xembr.totalStaking = xembr.totalStaking.minus(transferAmount)
    xembr.save()

    xembrSnapshot.totalCooling =  xembr.totalCooling.plus(transferAmount)
    xembrSnapshot.totalStaking = xembrSnapshot.totalStaking.minus(transferAmount)
    xembrSnapshot.save()

    user.cooling =  user.cooling.plus(transferAmount)
    user.staking =  user.staking.minus(transferAmount)
    user.save()

    userSnapshot.cooling =  userSnapshot.cooling.plus(transferAmount)
    userSnapshot.staking =  userSnapshot.staking.minus(transferAmount)
    userSnapshot.save()
}

export function handleCooldownExited(event: CooldownExited): void {
    let userAddr = event.params.user

    let xembr = getXEmbr()
    let xembrSnapshot = getXEmbrSnapshot(event)

    let userSnapshot = getUserSnapshot(userAddr, event)
    let user = getUser(userAddr)

    let cooldownAmt = user.cooling
    
    xembr.totalCooling = xembr.totalCooling.minus(cooldownAmt)
    xembr.totalStaking = xembr.totalStaking.plus(cooldownAmt)
    xembr.save()

    xembrSnapshot.totalCooling = xembrSnapshot.totalCooling.minus(cooldownAmt)
    xembrSnapshot.totalStaking = xembrSnapshot.totalStaking.plus(cooldownAmt)
    xembrSnapshot.save()

    user.cooling = user.cooling.minus(cooldownAmt)
    user.staking = user.staking.plus(cooldownAmt)
    user.save()

    userSnapshot.cooling = userSnapshot.cooling.minus(cooldownAmt)
    userSnapshot.staking = userSnapshot.staking.plus(cooldownAmt)
    userSnapshot.save()
}

export function handleWithdraw(event: Withdraw): void {
    let amount = event.params.amount
    let userAddr = event.params.user

    


    let transferAmount = tokenToDecimal(amount, 18);

    let xembr = getXEmbr()
    let xembrSnapshot = getXEmbrSnapshot(event)

    let userSnapshot = getUserSnapshot(userAddr, event)
    let user = getUser(userAddr)


    let unitsOfCoolToRemove =  user.cooling.minus(user.cooling.minus(transferAmount))

    log.info('handleWithdraw: {} {} {}', [userAddr.toHexString(), amount.toString(), unitsOfCoolToRemove.toString()]);
    //xembr.totalStaking = xembr.totalStaking.minus(transferAmount)
    
    if (user.staking.equals(ZERO_BD)) {
        xembr.userCount -= 1
    }
    xembr.totalCooling = xembr.totalCooling.minus(unitsOfCoolToRemove)
    xembrSnapshot.totalCooling = xembrSnapshot.totalCooling.minus(unitsOfCoolToRemove)
    xembr.save()
    xembrSnapshot.save()

   // user.staking = user.staking.minus(transferAmount)
    user.cooling = user.cooling.minus(transferAmount)
    user.save()

    //userSnapshot.staking = userSnapshot.staking.minus(transferAmount)
    userSnapshot.cooling = userSnapshot.cooling.minus(transferAmount)
    userSnapshot.save()
}


export function handleRewardAdded(event: RewardAdded): void {
    let reward = event.params.reward
    let rewardToken = event.params.rewardToken

    let token =  getToken(rewardToken)
    let tokenSnapshot = getTokenSnapshot(rewardToken, event)
    let xembrSnapshot = getXEmbrSnapshot(event)
   

    let transferAmount = tokenToDecimal(reward, token.decimals);

    token.totalUnclaimed = token.totalUnclaimed.plus(transferAmount)
    token.save()

    tokenSnapshot.totalUnclaimed = tokenSnapshot.totalUnclaimed.plus(transferAmount)
    tokenSnapshot.save()

    let xembr = getXEmbr()
    /*let rewards: string[] = []
    for(let i = 0; i < xembr.rewards.length; i++) { 
        let token = RewardToken.load(xembr.rewards[i])
        if(token?.active) { 
            rewards.push(token.id)
        }
    }*/
    xembrSnapshot.rewards = xembr.rewards
    xembrSnapshot.save()    
}

export function handleRewardPaid(event: RewardPaid): void {
    let reward = event.params.reward
    let rewardToken = event.params.rewardToken
    let userAddr = event.params.user
    //event.params.to

    let token =  getToken(rewardToken)
    let tokenSnapshot = getTokenSnapshot(rewardToken, event)
    let xembrSnapshot = getXEmbrSnapshot(event)

    let transferAmount = tokenToDecimal(reward, token.decimals);

    let userReward = getUserReward(userAddr, rewardToken, event)
    userReward.claimed = userReward.claimed.plus(transferAmount)
    userReward.save()

    let user = getUser(userAddr)
    let userSnapshot = getUserSnapshot(userAddr, event)
    userSnapshot.rewards = user.rewards
    userSnapshot.save()

    token.totalClaimed =  token.totalClaimed.plus(transferAmount)
    token.totalUnclaimed =  token.totalUnclaimed.minus(transferAmount)
    token.save()

    tokenSnapshot.totalClaimed =  tokenSnapshot.totalClaimed.plus(transferAmount)
    tokenSnapshot.totalUnclaimed =  tokenSnapshot.totalUnclaimed.minus(transferAmount)
    tokenSnapshot.save()

    let xembr = getXEmbr()
    /*let rewards: string[] = []
    for(let i = 0; i < xembr.rewards.length; i++) { 
        let token = RewardToken.load(xembr.rewards[i])
        if(token?.active) { 
            rewards.push(token.id)
        }
    }*/
    xembrSnapshot.rewards = xembr.rewards
    xembrSnapshot.save()
}



export function handleLogTokenUpdate(event: LogTokenUpdate): void {

}











