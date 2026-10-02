export const story = {
  "id": "opt-out",
  "title": "Opt-Out",
  "description": "A grounded puzzle game about cancelling an unwanted subscription before midnight. Navigate real-world dark patterns, confirmshaming, and a relentless retention agent entirely within your phone messaging app.",
  "initialTime": "11:48 PM",
  "variables": {
    "trapsAvoided": 0,
    "patience": 5
  },
  "characters": {
    "bot": {
      "name": "StreamLoop Support",
      "avatarColor": "#ef4444",
      "avatarText": "SL",
      "isPlayer": false,
      "visibleByDefault": true
    },
    "sam": {
      "name": "Sam",
      "avatarColor": "#3b82f6",
      "avatarText": "SM",
      "isPlayer": false,
      "visibleByDefault": true
    },
    "devon": {
      "name": "Devon from Retention",
      "avatarColor": "#f59e0b",
      "avatarText": "DV",
      "isPlayer": false,
      "visibleByDefault": false
    },
    "player": {
      "name": "You",
      "avatarColor": "#10b981",
      "avatarText": "ME",
      "isPlayer": true,
      "visibleByDefault": true
    }
  },
  "nodes": [
    {
      "sender": "bot",
      "text": "Welcome to StreamLoop in-app support. Your Annual Unlimited Plan is scheduled to auto-renew at midnight tonight for 179.99 dollars. You have selected: Cancel Subscription. How can we assist you with your account tonight?",
      "delay": 1000
    },
    {
      "sender": "sam",
      "text": "Hey, did you open the StreamLoop support chat yet? It is 11:48 PM. If you do not get them to cancel it before midnight, the annual renewal goes through automatically. Watch out, their support bot is programmed to steer you into pauses and fake downgrades.",
      "delay": 1200
    },
    {
      "sender": "sam",
      "text": "Are you in the chat with the bot right now?",
      "delay": 1200,
      "choices": [
        {
          "text": "I just opened the support thread. What should I look out for first?",
          "chat": "sam",
          "nodes": [
            {
              "sender": "sam",
              "text": "They always lead with a pause offer. They will ask if you want to pause for sixty days. Do not agree to it. If you reply agreeing to pause, they pause billing for two months and then quietly charge you the full 179.99 dollars without a reminder email. Tell them to decline the pause and proceed with cancellation.",
              "delay": 1200
            }
          ]
        },
        {
          "text": "Yes, the bot is asking how it can help.",
          "chat": "sam",
          "nodes": [
            {
              "sender": "sam",
              "text": "Whatever you do, do not accept any offers to pause or change tiers. Tell them directly to decline all pauses and cancel your membership.",
              "delay": 1200
            }
          ]
        }
      ]
    },
    {
      "sender": "bot",
      "text": "Rather than closing your account and losing your library, would you prefer to pause your subscription for sixty days at zero cost?",
      "delay": 1300,
      "choices": [
        {
          "text": "Pause my subscription for sixty days instead of cancelling.",
          "chat": "bot",
          "actions": { "advanceMinutes": 3, "patience": -1 },
          "nodes": [
            {
              "sender": "bot",
              "text": "Membership paused for sixty days. Per paragraph fourteen of the Subscriber Agreement, your account will automatically resume billing at the full annual rate of 179.99 dollars at the end of the pause period without further notification.",
              "delay": 1400
            },
            {
              "sender": "bot",
              "text": "If you still wish to finalize complete cancellation tonight, please confirm your request.",
              "delay": 1200
            }
          ]
        },
        {
          "text": "Can I switch to a cheaper monthly plan instead?",
          "chat": "bot",
          "actions": { "advanceMinutes": 3, "patience": -1 },
          "nodes": [
            {
              "sender": "bot",
              "text": "Your account has been switched to Monthly Saver. Your card on file has been charged 14.99 dollars today. If you did not intend to switch plans, please state your cancellation request again.",
              "delay": 1400
            },
            {
              "sender": "bot",
              "text": "Please reply to confirm whether you wish to keep this new plan or continue cancelling.",
              "delay": 1200
            }
          ]
        },
        {
          "text": "Decline pause offer and proceed with complete cancellation.",
          "chat": "bot",
          "actions": { "advanceMinutes": 2, "trapsAvoided": 1 },
          "nodes": [
            {
              "sender": "bot",
              "text": "Decline recorded. Proceeding with cancellation workflow. Loading your account retention review.",
              "delay": 1200
            }
          ]
        }
      ]
    },
    {
      "sender": "sam",
      "text": "Good, you dodged the pause trap. Next they will send an account review listing everything you will lose, like grandfathered pricing and loyalty points. It is designed to trigger loss aversion. Do not let them psych you out.",
      "delay": 1400
    },
    {
      "sender": "bot",
      "text": "Account Retention Review: If you cancel today, your account will immediately surrender all grandfathered benefits: your grandfathered annual rate of 179.99 dollars which increases to 239.99 dollars if you ever return, 540 unredeemed StreamLoop loyalty points, downloaded offline episodes on this phone, and your personalized recommendation profile. Please confirm your decision below.",
      "delay": 1600,
      "choices": [
        {
          "text": "Wait, will my downloaded episodes really stop working on my phone tonight?",
          "chat": "bot",
          "actions": { "advanceMinutes": 3, "patience": -1 },
          "nodes": [
            {
              "sender": "bot",
              "text": "Yes. Offline licenses terminate on this phone at midnight. Keep your subscription active to maintain offline playback.",
              "delay": 1400
            },
            {
              "sender": "bot",
              "text": "Our billing records indicate your renewal window closes in just a few minutes.",
              "delay": 1200
            }
          ]
        },
        {
          "text": "Can I keep my loyalty points active if I cancel?",
          "chat": "bot",
          "actions": { "advanceMinutes": 3, "patience": -1 },
          "nodes": [
            {
              "sender": "bot",
              "text": "Loyalty point redemption requires an active paid subscription. Unredeemed points are deleted upon cancellation.",
              "delay": 1400
            }
          ]
        },
        {
          "text": "I understand and accept the loss of benefits. Continue with cancellation.",
          "chat": "bot",
          "actions": { "advanceMinutes": 2, "trapsAvoided": 1 },
          "nodes": [
            {
              "sender": "bot",
              "text": "Forfeiture of benefits confirmed. Routing to mandatory exit survey.",
              "delay": 1200
            }
          ]
        }
      ]
    },
    {
      "sender": "sam",
      "text": "Here comes the exit survey. Do not select that it is too expensive. If you pick price, their system will automatically generate a three-step discount counter-offer that wastes precious minutes. Select Other and do not provide details.",
      "delay": 1400
    },
    {
      "sender": "bot",
      "text": "Please select the primary reason for your cancellation today so we can improve our service:",
      "delay": 1300,
      "choices": [
        {
          "text": "The subscription is too expensive.",
          "chat": "bot",
          "actions": { "advanceMinutes": 3, "patience": -2 },
          "nodes": [
            {
              "sender": "bot",
              "text": "We value your membership. Because you indicated price is a concern, our system has unlocked a special rate: stay with us for 3.99 per month for the next three months, billed as an upfront non-refundable charge of 29.99 dollars. Would you like to accept this offer?",
              "delay": 1500
            },
            {
              "sender": "bot",
              "text": "Offer declined by user. Resuming cancellation queue.",
              "delay": 1300
            }
          ]
        },
        {
          "text": "I experienced app crashes and streaming errors.",
          "chat": "bot",
          "actions": { "advanceMinutes": 3, "patience": -1 },
          "nodes": [
            {
              "sender": "bot",
              "text": "We apologize for the technical difficulties. Our system has initiated a remote diagnostics test on your device connection. Test in progress.",
              "delay": 1500
            },
            {
              "sender": "bot",
              "text": "Diagnostics test cancelled. Returning to cancellation queue.",
              "delay": 1200
            }
          ]
        },
        {
          "text": "Other reason with no additional feedback provided.",
          "chat": "bot",
          "actions": { "advanceMinutes": 2, "trapsAvoided": 1 },
          "nodes": [
            {
              "sender": "bot",
              "text": "Response recorded. Survey completed. Generating cancellation ticket.",
              "delay": 1200
            }
          ]
        }
      ]
    },
    {
      "sender": "bot",
      "text": "In-app automated cancellation is temporarily unavailable due to scheduled database maintenance. Transferring this support chat to a Member Retention Specialist. Position in queue: 1.",
      "delay": 1600
    },
    {
      "sender": "sam",
      "text": "They are bringing in a live agent named Devon. His job is to drag out the conversation until midnight because their billing script charges your card automatically at 12:00 AM even if you are in the middle of a chat. Do not negotiate. Demand immediate cancellation under FTC click-to-cancel rules.",
      "delay": 1500
    },
    {
      "sender": "devon",
      "text": "Hello, my name is Devon from the Member Loyalty Team. I see you are looking to cancel your StreamLoop subscription tonight. I would be glad to check on your account. Before we proceed, could you share a little about what we could have done better?",
      "delay": 1600,
      "choices": [
        {
          "text": "I just do not use the app enough to justify the annual renewal.",
          "chat": "devon",
          "actions": { "advanceMinutes": 2, "patience": -1 },
          "nodes": [
            {
              "sender": "devon",
              "text": "I completely understand. A lot of our members feel that way until they explore our new releases. What if I switch you to our Flex Pass at 89.99 dollars every six months?",
              "delay": 1600
            }
          ]
        },
        {
          "text": "Devon, it is getting close to midnight. Stop stalling and cancel my account right now.",
          "chat": "devon",
          "actions": { "advanceMinutes": 2 },
          "nodes": [
            {
              "sender": "devon",
              "text": "I understand your urgency, but company policy requires that I review your account options and confirm that you understand account closure is permanent.",
              "delay": 1600
            }
          ]
        },
        {
          "text": "Devon, I am declining all retention offers. Under FTC click-to-cancel rules, please process my immediate cancellation without delay.",
          "chat": "devon",
          "actions": { "advanceMinutes": 2, "trapsAvoided": 1 },
          "nodes": [
            {
              "sender": "devon",
              "text": "Understood. Bypassing standard retention script. Accessing administrative override console.",
              "delay": 1400
            }
          ]
        }
      ]
    },
    {
      "sender": "devon",
      "text": "To disable recurring billing and submit the cancellation to our payment processor, our compliance protocol requires your final confirmation. Do you authorize the immediate termination of your StreamLoop subscription and the removal of all associated account access?",
      "delay": 1600,
      "choices": [
        {
          "text": "Can I have until tomorrow morning to think it over?",
          "chat": "devon",
          "actions": { "advanceMinutes": 2, "patience": -1 },
          "nodes": [
            {
              "sender": "devon",
              "text": "Unfortunately, the billing cycle resets automatically at midnight. If the account is still open at 12:00 AM, the banking network charges the renewal.",
              "delay": 1500
            }
          ]
        },
        {
          "text": "If I change my mind tomorrow, can I get a refund on the renewal?",
          "chat": "devon",
          "actions": { "advanceMinutes": 2, "patience": -2 },
          "nodes": [
            {
              "sender": "devon",
              "text": "All renewal charges are strictly non-refundable once processed. If you are hesitant, I recommend keeping the plan active.",
              "delay": 1600
            }
          ]
        },
        {
          "text": "Yes. I authorize immediate termination. Please provide my cancellation reference code now.",
          "chat": "devon",
          "actions": { "advanceMinutes": 1, "trapsAvoided": 1 },
          "nodes": [
            {
              "sender": "devon",
              "text": "Processing cancellation override. Submission timestamp logged.",
              "delay": 1400
            }
          ]
        }
      ]
    },
    {
      "type": "conditional",
      "variable": "trapsAvoided",
      "operator": ">=",
      "value": 4,
      "trueNodes": [
        {
          "sender": "devon",
          "clock": "11:59 PM",
          "text": "Cancellation confirmed. Your StreamLoop Annual Plan has been terminated. Recurring billing has been successfully disabled. Total charged tonight: 0.00 dollars. Cancellation reference code SL-94281.",
          "delay": 1500
        },
        {
          "sender": "sam",
          "text": "You actually did it. You navigated every dark pattern, dodged the fake discounts, and beat the midnight renewal deadline. That was a masterclass in subscription defense.",
          "delay": 1400
        }
      ],
      "falseNodes": [
        {
          "sender": "bot",
          "clock": "12:00 AM",
          "text": "Billing Alert: It is now 12:00 AM. Your annual subscription to StreamLoop has automatically renewed for 179.99 dollars. Your card ending in 4108 has been charged. Next renewal date is one year from today.",
          "delay": 1500
        },
        {
          "sender": "sam",
          "text": "They got you. The charge notification just popped up on our shared account. Devon stalled you until midnight and the automated billing script took over. We are stuck with StreamLoop for another twelve months.",
          "delay": 1400
        }
      ]
    },
    {
      "sender": "bot",
      "text": "This support session is now closed.",
      "delay": 1000,
      "choices": [
        {
          "text": "Play again",
          "restart": true
        }
      ]
    }
  ]
};

export default story;
