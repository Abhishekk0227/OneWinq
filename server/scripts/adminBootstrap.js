import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/connection.js';
import { User } from '../src/modules/users/user.model.js';
import { Subscription } from '../src/modules/subscriptions/subscription.model.js';
import { ADMIN_ROLE, ACCOUNT_STATE, PLAN_TIER, SUBSCRIPTION_STATUS, SUBSCRIPTION_GATEWAY } from '../src/config/constants.js';
import logger from '../src/utils/logger.js';

async function bootstrapAdmin() {
  const emailFlag = process.argv.slice(2).find((a) => a.startsWith('--email='));
  const emailValue = emailFlag
    ? emailFlag.split('=')[1]
    : process.argv.slice(2).find((a) => !a.startsWith('-')) ||
      process.env.ADMIN_BOOTSTRAP_EMAIL;

  if (!emailValue) {
    console.error('Error: Missing email argument.\nUsage: node scripts/adminBootstrap.js --email=admin@example.com');
    process.exitCode = 1;
    return;
  }

  const targetEmail = emailValue.trim().toLowerCase();

  logger.info(`[AdminBootstrap] Connecting to database to bootstrap admin: ${targetEmail}`);
  await connectDatabase();

  try {
    let user = await User.findOne({ email: targetEmail });


    if (!user) {
      const allUsers = await User.find({}, 'email username role accountState').lean();
      logger.error(`[AdminBootstrap] No user found with email: "${targetEmail}"`);
      if (allUsers.length > 0) {
        console.log('\nExisting users currently in the database:');
        console.table(allUsers.map((u) => ({
          id: u._id.toString(),
          email: u.email,
          username: u.username,
          role: u.role,
          accountState: u.accountState,
        })));
      } else {
        console.log('\nNo users found in database yet. Please register via the UI or API first.');
      }
      process.exitCode = 1;
      return;
    }

    const previousRole = user.role;
    user.role = ADMIN_ROLE.SUPER_ADMIN;
    user.emailVerified = true;
    user.accountState = ACCOUNT_STATE.ACTIVE;
    await user.save();

    // Ensure user has Pro/Enterprise entitlement on subscription
    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      subscription = await Subscription.create({
        userId: user._id,
        planCode: PLAN_TIER.PRO,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        gateway: SUBSCRIPTION_GATEWAY.SYSTEM,
      });
    } else {
      subscription.planCode = PLAN_TIER.PRO;
      subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
      await subscription.save();
    }

    console.log('\n======================================================');
    console.log('🎉 ONE WINQ ADMIN BOOTSTRAP SUCCESSFUL');
    console.log('======================================================');
    console.log(`User ID        : ${user._id}`);
    console.log(`Username       : @${user.username}`);
    console.log(`Display Name   : ${user.displayName}`);
    console.log(`Email          : ${user.email}`);
    console.log(`Previous Role  : ${previousRole}`);
    console.log(`New Role       : ${user.role} (Highest Admin)`);
    console.log(`Account State  : ${user.accountState}`);
    console.log(`Email Verified : ${user.emailVerified}`);
    console.log(`Subscription   : ${subscription.planCode} (${subscription.status})`);
    console.log('======================================================\n');

    logger.info(`[AdminBootstrap] Successfully elevated @${user.username} (${user.email}) to ${ADMIN_ROLE.SUPER_ADMIN}`);
  } catch (error) {
    logger.error('[AdminBootstrap] Failed to bootstrap admin:', { error: error.message });
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

bootstrapAdmin();
