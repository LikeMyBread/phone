/**
 * Multi-character stories configured for tree dialogue stacks.
 * Messages include sender IDs that route them to separate active chat threads.
 * Choices can target specific characters using the "chat" property.
 */

export const defaultStories = {
  "lost_signal": {
    "title": "Lost Signal",
    "description": "Help Lt. Carver survive on a methane moon. Balance his survival with instructions from Orbital Station Scientist Dr. Aris.",
    "variables": {
      "oxygen": 100,
      "trust": 0
    },
    "characters": {
      "astro": {
        "name": "Lt. Carver",
        "avatarColor": "#06b6d4",
        "avatarText": "LC",
        "isPlayer": false
      },
      "scientist": {
        "name": "Dr. Aris (HQ)",
        "avatarColor": "#10b981",
        "avatarText": "DA",
        "isPlayer": false
      },
      "player": {
        "name": "Mission Control (You)",
        "avatarColor": "#8b5cf6",
        "avatarText": "MC",
        "isPlayer": true
      }
    },
    "nodes": [
      {
        "sender": "astro",
        "text": "[STATIC] ...Hello? Is anyone receiving this? My pod's comms are fried. I'm broadcasting on an open emergency frequency. Please, anyone respond.",
        "delay": 1500,
        "choices": [
          {
            "text": "I read you, Lieutenant. State your name and position.",
            "actions": { "trust": 1 },
            "nodes": [
              {
                "sender": "astro",
                "text": "Thank God! I'm Lieutenant Carver, Hermes-VI surveyor. I crashed on Sector 4-B. My pod is half-buried in methane ice. I... I don't know how long my seals will hold.",
                "delay": 1200
              }
            ]
          },
          {
            "text": "Who is this? Is this a joke?",
            "actions": { "trust": -1 },
            "nodes": [
              {
                "sender": "astro",
                "text": "A joke?! I'm bleeding from a head wound and my heater is failing. This is NOT a joke! Please... I need telemetry alignment.",
                "delay": 1200
              }
            ]
          }
        ]
      },
      {
        "sender": "astro",
        "text": "Checking suit telemetry. Oxygen is at 65%. But the tank heating element is warning of a low-temp freeze. If the valve freezes open, I'll vent everything in minutes.",
        "delay": 1500,
        "choices": [
          {
            "text": "Use the manual bypass valve. It should warm the pipe.",
            "actions": { "oxygen": -15 },
            "nodes": [
              {
                "sender": "astro",
                "text": "[HISSING SOUND IN STATIC] Okay, I cracked the bypass. The temperature is climbing, but I heard a sharp pop. The seal held, but it took a lot of gas to flush the ice block. Oxygen is down to 50%.",
                "delay": 1500
              }
            ]
          },
          {
            "text": "Leave it alone. The automated cycle might kick in.",
            "actions": { "oxygen": -30 },
            "nodes": [
              {
                "sender": "astro",
                "text": "Oh no... Oh god, the valve is jammed! It's venting! It's venting! [STATIC SCREAMS] The automated failsafe did nothing! I had to hit it with a wrench to close it. Oxygen plummeted to 35%!",
                "delay": 2000
              }
            ]
          }
        ]
      },
      {
        "sender": "scientist",
        "text": "Attention Mission Control. This is Dr. Aris from the Hermes orbital station. We intercepted your emergency signal. Be advised, scans show thermal vent cave on Sector 4-B is highly unstable. Do not let Carver shelter there.",
        "delay": 2000
      },
      {
        "sender": "astro",
        "text": "I'm looking out the window now. I see the cargo crate to the east, and a thermal cave to the west. My suit is freezing. What's the call?",
        "delay": 1500,
        "choices": [
          {
            "text": "Head for the cargo crate. There might be fresh oxygen cells.",
            "chat": "astro",
            "nodes": [
              {
                "type": "conditional",
                "variable": "oxygen",
                "operator": ">",
                "value": 45,
                "trueNodes": [
                  {
                    "sender": "astro",
                    "text": "I made it! The walk was grueling but the crate is intact. I'm opening it... YES! A spare emergency oxygen canister. Hooking it up... telemetry shows 95%!",
                    "delay": 2000,
                    "actions": { "oxygen": 55 }
                  },
                  {
                    "sender": "astro",
                    "text": "Signal is stable. I can hear the rescue ship thrusters overhead. Thank you. I would have died out here alone in the dark. Signing off.",
                    "delay": 2000
                  }
                ],
                "falseNodes": [
                  {
                    "sender": "astro",
                    "text": "I... I can't... the air is too thin. I'm falling. The cargo pod is so far... and it's so dark... My visor is freezing over... [STATIC]",
                    "delay": 2500
                  },
                  {
                    "sender": "system",
                    "text": "[CONNECTION TERMINATED: TELEMETRY SIGNALS DETECTED NO VITAL SIGNS. MISSION FAILED.]",
                    "delay": 1500
                  }
                ]
              }
            ]
          },
          {
            "text": "Head for the thermal cave. You need heat first and foremost.",
            "chat": "astro",
            "nodes": [
              {
                "type": "conditional",
                "variable": "trust",
                "operator": ">=",
                "value": 1,
                "trueNodes": [
                  {
                    "sender": "astro",
                    "text": "I trusted your call, and it paid off. The cave is incredibly warm due to geothermal activity. I can plug my suit into a backup solar rig someone left here. I'm safe!",
                    "delay": 2000
                  },
                  {
                    "sender": "astro",
                    "text": "Rescue crew is landing right outside the cave entrance. We did it. Thank you for guiding me through the dark.",
                    "delay": 2000
                  }
                ],
                "falseNodes": [
                  {
                    "sender": "astro",
                    "text": "I went into the cave, but... I was so nervous because I didn't trust your direction. I panicked, took a wrong turn, and fell into a sulphur vent. The suit seals are melting! [STATIC]",
                    "delay": 2500
                  },
                  {
                    "sender": "system",
                    "text": "[CONNECTION TERMINATED: TELEMETRY SIGNALS DETECTED NO VITAL SIGNS. MISSION FAILED.]",
                    "delay": 1500
                  }
                ]
              }
            ]
          },
          {
            "text": "[Inform Dr. Aris] Carver's oxygen is too low. We have to use the cave. Realign station scans to guide him.",
            "chat": "scientist",
            "actions": { "trust": 1 },
            "nodes": [
              {
                "sender": "scientist",
                "text": "Understood. Realigning scanning arrays. Stand by... I found a thermal pocket that is structurally safe. Guiding him now.",
                "delay": 1800
              },
              {
                "sender": "astro",
                "text": "Mission Control, I'm inside the cave. I got coordinates from a science channel. The heat is holding. I hear a landing crew nearby! I'm saved!",
                "delay": 2000
              }
            ]
          }
        ]
      },
      {
        "sender": "system",
        "text": "[STORY ENDED]",
        "delay": 1000,
        "choices": [
          {
            "text": "[Restart Playtest]",
            "restart": true
          }
        ]
      }
    ]
  },
  "unknown_caller": {
    "title": "Unknown Caller",
    "description": "An unknown number sends a creepy video. Talk your way out of danger, and coordinate with your friend Mark.",
    "variables": {
      "panic": 0,
      "copsCalled": 0
    },
    "characters": {
      "stalker": {
        "name": "Unknown",
        "avatarColor": "#ef4444",
        "avatarText": "?",
        "isPlayer": false
      },
      "friend": {
        "name": "Mark (Friend)",
        "avatarColor": "#3b82f6",
        "avatarText": "MK",
        "isPlayer": false
      },
      "player": {
        "name": "You",
        "avatarColor": "#10b981",
        "avatarText": "ME",
        "isPlayer": true
      }
    },
    "nodes": [
      {
        "sender": "stalker",
        "text": "Nice red curtains in your living room. You should close them. It's chilly outside.",
        "delay": 1500,
        "choices": [
          {
            "text": "Who is this? Stop messing around or I'm calling the police.",
            "actions": { "panic": 1 },
            "nodes": [
              {
                "sender": "stalker",
                "text": "Go ahead. The local precinct has a 12-minute average response time tonight. I'm much closer than that. I'm right outside.",
                "delay": 1500
              }
            ]
          },
          {
            "text": "Haha very funny Mark. I know it's you.",
            "nodes": [
              {
                "sender": "stalker",
                "text": "I'm not Mark. But Mark is asleep in his apartment across town. I watched him go inside an hour ago. You, on the other hand, are still wide awake.",
                "delay": 1800
              }
            ]
          }
        ]
      },
      {
        "sender": "friend",
        "text": "Hey Sarah, are you awake? A random local number just texted me asking if you were alone tonight. It freaked me out. Are you okay?",
        "delay": 2000
      },
      {
        "sender": "stalker",
        "text": "Your golden retriever is sweet, but he's currently eating the steak I threw over the fence. And security cameras are useless when the power line is cut.",
        "delay": 1800,
        "choices": [
          {
            "text": "Please, please stop. Tell me what you want from me.",
            "chat": "stalker",
            "nodes": [
              {
                "sender": "stalker",
                "text": "I want you to walk to the front door. Open it. The box contains the dashcam footage from three years ago on the lake road.",
                "delay": 1500
              }
            ]
          },
          {
            "text": "I'm armed. I will shoot if you step on my porch.",
            "chat": "stalker",
            "actions": { "panic": 2 },
            "nodes": [
              {
                "sender": "stalker",
                "text": "You don't own a gun. You hate firearms. You wrote a blog post about it last year. Walk to the door.",
                "delay": 1800
              }
            ]
          },
          {
            "text": "[Text Mark] Mark, someone is at my house! Call the police immediately to my address!",
            "chat": "friend",
            "actions": { "copsCalled": 1 },
            "nodes": [
              {
                "sender": "friend",
                "text": "Oh my god! I'm calling 911 right now. I'm getting in my car. Lock yourself in the bathroom, do not go to the door!",
                "delay": 1500
              }
            ]
          }
        ]
      },
      {
        "sender": "stalker",
        "text": "Open the door Sarah. If you don't open the front door, I will come through the sliding glass in the kitchen.",
        "delay": 1500,
        "choices": [
          {
            "text": "[Open the front door slowly]",
            "nodes": [
              {
                "sender": "stalker",
                "text": "You opened it. There is nobody on the porch. Just a cardboard box with a tape inside, and a sticky note: 'I'm watching you. Next time, confess to the police.'",
                "delay": 2000
              },
              {
                "sender": "system",
                "text": "[YOU SURVIVED the encounter, but the tape holds your secret. The mystery caller has vanished, leaving you with a final warning. THE END.]",
                "delay": 1500
              }
            ]
          },
          {
            "text": "[Lock yourself in the bathroom and hide]",
            "nodes": [
              {
                "type": "conditional",
                "variable": "copsCalled",
                "operator": "==",
                "value": 1,
                "trueNodes": [
                  {
                    "sender": "system",
                    "text": "[RED AND BLUE LIGHTS FLASH THROUGH THE WINDOW. Police sirens wail. You hear officers shouting on the lawn. A figure shadows away into the forest. You are safe. For now.]",
                    "delay": 2000
                  }
                ],
                "falseNodes": [
                  {
                    "sender": "system",
                    "text": "[THE LIGHTS GO OUT. You hear the sliding glass shatter in the kitchen. Heavy footsteps walk down the hall. A shadow enters the room. Connection Lost.]",
                    "delay": 2000
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "sender": "system",
        "text": "[STORY ENDED]",
        "delay": 1000,
        "choices": [
          {
            "text": "[Play Again]",
            "restart": true
          }
        ]
      }
    ]
  },
  "matchmaker_madness": {
    "title": "Matchmaker Madness",
    "description": "Help Chloe text her crush, but when Dan texts you by mistake, you must choose who to answer.",
    "variables": {
      "smoothness": 0
    },
    "characters": {
      "chloe": {
        "name": "Chloe (Bestie)",
        "avatarColor": "#ec4899",
        "avatarText": "CH",
        "isPlayer": false
      },
      "dan": {
        "name": "Dan (Crush)",
        "avatarColor": "#eab308",
        "avatarText": "DN",
        "isPlayer": false
      },
      "player": {
        "name": "You",
        "avatarColor": "#a855f7",
        "avatarText": "ME",
        "isPlayer": true
      }
    },
    "nodes": [
      {
        "sender": "chloe",
        "text": "SOS! Emergency! Dan just walked into the coffee shop and sat TWO tables away from me! He's wearing that corduroy jacket. What do I do?!",
        "delay": 1200,
        "choices": [
          {
            "text": "Go over there and say hi! Be direct!",
            "actions": { "smoothness": 1 },
            "nodes": [
              {
                "sender": "chloe",
                "text": "Are you insane?! I would open my mouth and only bird sounds would come out. Should I text him instead?",
                "delay": 1500
              }
            ]
          },
          {
            "text": "Drop your pen 'accidentally' near his table. Classic movie move.",
            "actions": { "smoothness": -1 },
            "nodes": [
              {
                "sender": "chloe",
                "text": "Okay, okay, I tried it. I dropped my pen... but it rolled under his shoe. When I bent to grab it, I bumped my head on the table and knocked over his cup! Coffee everywhere!",
                "delay": 1800
              }
            ]
          }
        ]
      },
      {
        "sender": "dan",
        "text": "Hey! I think Chloe is in this coffee shop. She just dropped a pen and knocked over my cup, and then bolted into the bathroom. Is she mad at me? Did I do something wrong?",
        "delay": 1500
      },
      {
        "sender": "chloe",
        "text": "Sarah, I'm hiding in the bathroom. He saw me run. What do I write to him?",
        "delay": 1500,
        "choices": [
          {
            "text": "[Text Chloe] Text him: 'So sorry about the coffee! Can I buy you another one?'",
            "chat": "chloe",
            "actions": { "smoothness": 2 },
            "nodes": [
              {
                "sender": "chloe",
                "text": "I texted him that. He wrote back: 'Sure! I'm in line, join me.' AHHH! We are sharing a table now!",
                "delay": 1800
              }
            ]
          },
          {
            "text": "[Text Dan] Hey Dan! She's not mad at all, she's just super embarrassed because she likes you. Go buy her a clean coffee!",
            "chat": "dan",
            "actions": { "smoothness": 4 },
            "nodes": [
              {
                "sender": "dan",
                "text": "Oh, haha! That's actually really cute. I'll order her a latte. Thanks for the heads up!",
                "delay": 1800
              },
              {
                "sender": "chloe",
                "text": "OMG! He was waiting at the counter with a coffee for me! We are sitting together! He says he thinks I'm cute!",
                "delay": 1500
              }
            ]
          }
        ]
      },
      {
        "sender": "chloe",
        "text": "[MATCHMAKER STATE: Finalizing score metrics...]",
        "delay": 1000,
        "choices": [
          {
            "text": "[Check Matchmaker Score]",
            "nodes": [
              {
                "type": "conditional",
                "variable": "smoothness",
                "operator": ">=",
                "value": 1,
                "trueNodes": [
                  {
                    "sender": "system",
                    "text": "[MATCHMAKER RATING: Cupid Elite. Chloe and Dan hit it off perfectly. You navigated the social anxiety like a pro!]",
                    "delay": 1500
                  }
                ],
                "falseNodes": [
                  {
                    "sender": "system",
                    "text": "[MATCHMAKER RATING: Disaster Zone. Chloe has blocked your number and is currently hiding in the grocery store freezer section.]",
                    "delay": 1500
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "sender": "system",
        "text": "[STORY ENDED]",
        "delay": 1000,
        "choices": [
          {
            "text": "[Play Again]",
            "restart": true
          }
        ]
      }
    ]
  }
};
