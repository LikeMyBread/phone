export const story = {
  "id": "office-mystery",
  "title": "The Espresso Incident",
  "description": "An office whodunit demonstrating the Knowledge Matrix and Canary Trap. Someone broke the executive espresso machine in the 3rd floor breakroom. Selectively feed clues to coworkers, track who knows what in the Knowledge Matrix, and catch the culprit who knows too much!",
  "initialTime": "2:15 PM",
  "variables": {
    "cluesShared": 0,
    "confronted": 0
  },
  "facts": [
    "cracked_handle",
    "happened_at_145",
    "decaf_hazelnut"
  ],
  "characters": {
    "player": {
      "name": "You",
      "avatarColor": "#8b5cf6",
      "avatarText": "ME",
      "isPlayer": true,
      "visibleByDefault": true
    },
    "texter": {
      "name": "Anonymous Coworker",
      "avatarColor": "#ef4444",
      "avatarText": "??",
      "isPlayer": false,
      "visibleByDefault": true
    },
    "dave": {
      "name": "Dave (Senior Dev)",
      "avatarColor": "#3b82f6",
      "avatarText": "DV",
      "isPlayer": false,
      "visibleByDefault": true
    },
    "claire": {
      "name": "Claire (Office Mgr)",
      "avatarColor": "#10b981",
      "avatarText": "CL",
      "isPlayer": false,
      "visibleByDefault": true
    },
    "greg": {
      "name": "Greg (VP of Sales)",
      "avatarColor": "#f59e0b",
      "avatarText": "GR",
      "isPlayer": false,
      "visibleByDefault": true
    }
  },
  "knowledgeMatrix": [
    [true, true, true],     // player knows all 3 clues initially
    [false, false, false],  // texter knows none
    [false, false, false],  // dave knows none
    [false, false, false],  // claire knows none
    [false, false, false]   // greg knows none
  ],
  "nodes": [
    {
      "sender": "texter",
      "text": "I know you were in the 3rd floor breakroom right after lunch. The $8,000 La Marzocco espresso machine is completely trashed. Facilities is pulling keycard logs in 15 minutes. Take the fall for it, or I tell VP Miller I saw you force the steam valve.",
      "delay": 1000,
      "choices": [
        {
          "text": "Who is this? What are you talking about?",
          "chat": "texter",
          "nodes": [
            {
              "sender": "texter",
              "text": "Doesn't matter who I am. What matters is that Miller has a client meeting at 2:45 PM and he expects his espresso. Take the blame or I submit the photo.",
              "delay": 1000
            }
          ]
        },
        {
          "text": "I didn't break anything. Check the breakroom camera.",
          "chat": "texter",
          "nodes": [
            {
              "sender": "texter",
              "text": "The breakroom camera has been tilted toward the ceiling since the holiday party. You're on your own unless you cooperate.",
              "delay": 1000
            }
          ]
        }
      ]
    },
    {
      "sender": "dave",
      "text": "Hey... did you see what happened by the kitchen? The whole third floor smells like scorched rubber gasket. Management is losing their minds. Do you know what actually happened to the machine?",
      "delay": 1200,
      "choices": [
        {
          "text": "I checked it out—the portafilter handle was cracked and taped with blue painter's tape.",
          "chat": "dave",
          "learn": { "character": "dave", "fact": "cracked_handle" },
          "actions": { "cluesShared": 1 },
          "nodes": [
            {
              "sender": "dave",
              "text": "Blue painter's tape? Who even has painter's tape in a software office? Weird. Anyway, I've been heads-down debugging Python since noon.",
              "delay": 1100
            }
          ]
        },
        {
          "text": "Someone jammed the commercial grinder with those decaf hazelnut beans from the lobby.",
          "chat": "dave",
          "learn": { "character": "dave", "fact": "decaf_hazelnut" },
          "actions": { "cluesShared": 1 },
          "nodes": [
            {
              "sender": "dave",
              "text": "Decaf hazelnut?! In an Italian commercial espresso machine? Absolute sacrilege. Whoever did that deserves HR.",
              "delay": 1100
            }
          ]
        },
        {
          "text": "No clue, Dave. I haven't been near the coffee bar today.",
          "chat": "dave",
          "nodes": [
            {
              "sender": "dave",
              "text": "Smart move. Stay far away from the crime scene. I'm sticking to instant coffee at my desk.",
              "delay": 1000
            }
          ]
        }
      ]
    },
    {
      "sender": "claire",
      "text": "Hey! As office manager, I'm trying to piece together a quick incident report for Facilities before Miller gets back. Did you happen to see what time the machine started hissing?",
      "delay": 1200,
      "choices": [
        {
          "text": "I walked past at exactly 1:45 PM during the all-hands meeting and saw steam pouring out.",
          "chat": "claire",
          "learn": { "character": "claire", "fact": "happened_at_145" },
          "actions": { "cluesShared": 1 },
          "nodes": [
            {
              "sender": "claire",
              "text": "1:45 PM? Perfect, that narrows down the badge swipe log a lot. Thanks!",
              "delay": 1000
            }
          ]
        },
        {
          "text": "I noticed the portafilter handle had blue painter's tape wrapped around it.",
          "chat": "claire",
          "learn": { "character": "claire", "fact": "cracked_handle" },
          "actions": { "cluesShared": 1 },
          "nodes": [
            {
              "sender": "claire",
              "text": "Blue painter's tape? Facilities doesn't use blue tape. That's super odd.",
              "delay": 1000
            }
          ]
        },
        {
          "text": "Sorry Claire, I had my noise-canceling headphones on all afternoon.",
          "chat": "claire",
          "nodes": [
            {
              "sender": "claire",
              "text": "No worries! Let me know if anyone mentions anything suspicious.",
              "delay": 1000
            }
          ]
        }
      ]
    },
    {
      "type": "conditional",
      "conditionType": "knowledge",
      "character": "dave",
      "fact": "decaf_hazelnut",
      "knows": true,
      "trueNodes": [
        {
          "sender": "texter",
          "text": "Stop trying to deflect by spreading rumors about decaf hazelnut beans! HR doesn't care what roast was in the grinder, they care about the repair bill.",
          "delay": 1400
        }
      ],
      "falseNodes": [
        {
          "type": "conditional",
          "conditionType": "knowledge",
          "character": "claire",
          "fact": "happened_at_145",
          "knows": true,
          "trueNodes": [
            {
              "sender": "texter",
              "text": "Claiming it happened at 1:45 PM won't save you. The security guard was doing rounds.",
              "delay": 1400
            }
          ],
          "falseNodes": [
            {
              "sender": "texter",
              "text": "Clock is ticking. 10 minutes until Facilities pulls the badge scans. You're running out of time.",
              "delay": 1400
            }
          ]
        }
      ]
    },
    {
      "sender": "dave",
      "text": "Hey, just between us... whoever broke it probably jammed the steam wand while trying to froth milk. But whatever you do, don't mention the blue tape to Greg.",
      "delay": 1300
    },
    {
      "sender": "system",
      "text": "[CANARY TRAP READY] Review what each suspect was told, then confront who slipped up.",
      "delay": 900,
      "choices": [
        {
          "text": "Confront Dave: 'Dave, YOU are the anonymous texter! You know things I never told the texter.'",
          "chat": "dave",
          "nodes": [
            {
              "type": "conditional",
              "conditionType": "knowledge",
              "character": "dave",
              "fact": "decaf_hazelnut",
              "knows": true,
              "trueNodes": [
                {
                  "sender": "dave",
                  "text": "...Fine! Alright, you got me! I'm the one texting you. I tried to pull a double shot of decaf hazelnut during the sprint demo, the pressure gauge redlined, and the handle cracked in my hand. I panicked because Miller threatened to reassign anyone who touched his machine. Please don't tell the team I drink decaf hazelnut!",
                  "delay": 1400,
                  "choices": [
                    {
                      "text": "Go to Facilities and tell Miller the truth. It was an accident.",
                      "chat": "dave",
                      "nodes": [
                        {
                          "sender": "dave",
                          "text": "You're right. I'll own up to it and pay for the new portafilter. Canary trap caught me fair and square. Mystery solved!",
                          "delay": 1000
                        }
                      ]
                    }
                  ]
                }
              ],
              "falseNodes": [
                {
                  "type": "conditional",
                  "conditionType": "knowledge",
                  "character": "dave",
                  "fact": "cracked_handle",
                  "knows": true,
                  "trueNodes": [
                    {
                      "sender": "dave",
                      "text": "Okay, okay, you caught me! I'm the anonymous texter. When you mentioned the blue tape, I thought you were onto me, so I panicked. I'll go confess to Facilities right now.",
                      "delay": 1200
                    }
                  ],
                  "falseNodes": [
                    {
                      "sender": "dave",
                      "text": "What?! I'm not sending anonymous texts, I've literally been sitting next to you all afternoon! You have no proof!",
                      "delay": 1200
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "text": "Confront Claire: 'Claire, are you sending me anonymous threats?'",
          "chat": "claire",
          "nodes": [
            {
              "sender": "claire",
              "text": "What?! Absolutely not! I'm the office manager, why on earth would I threaten you? You accused the wrong person!",
              "delay": 1200
            }
          ]
        },
        {
          "text": "Confront Greg: 'Greg, is this some aggressive sales motivation prank?'",
          "chat": "greg",
          "nodes": [
            {
              "sender": "greg",
              "text": "I don't know who this is, but I'm closing an enterprise deal in Tokyo. Do not message this number again.",
              "delay": 1200
            }
          ]
        }
      ]
    }
  ]
};
