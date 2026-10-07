# Game Design Document: Off the Record
**Working Title:** Off the Record  
**Target Format:** In-Phone Messaging Narrative (`stories/off-the-record.js`)  
**Engine:** Multi-Contact Dialogue Tree Engine ([engine.js](file:///Users/mike/Documents/Phone/engine.js))  
**Document Version:** 1.0  
**Status:** In Development / Brainstorming  

---

## 1. Executive Summary & Vision

*Off the Record* is a grounded, high-tension epistemic mystery played entirely through a smartphone interface. The player assumes the role of **Maya Lin**, a high-school senior and investigative editor of the school's online student newspaper, *The Beacon*. 

Late on a Sunday evening, Maya receives threatening texts from an unlisted number. The blackmailer claims to have surveillance footage placing Maya at the administrative building during a Friday night break-in where the semester exam key and financial records were stolen. The blackmailer demands that Maya destroy her draft investigative exposé on the Student Council budget before school opens on Monday morning—or the footage will be sent to the principal.

### Core Gameplay Pillar: Information Control & The Canary Trap
* **Boolean Knowledge Flags Only:** The game's variable system is used exclusively as binary checks (`0` or `1`) tracking **who knows what**.
* **Active Deduction Over Passive Reading:** The primary mechanic is deciding what information to share, withhold, or falsify across different conversations.
* **The "Two-Way Tell" Deduction System:**
  1. **The Echo:** The Unknown Texter taunts Maya with details that *only* the person she confided in could know.
  2. **The Slip-Up:** A suspect, chatting normally, inadvertently reveals knowledge of a detail Maya *never told them*, proving they possess the blackmailer's private knowledge.

---

## 2. Setting & Inciting Incident

### The Setting
* **Time:** Sunday night, 9:45 PM – 11:30 PM.
* **Atmosphere:** Claustrophobic, late-night texting; notification sounds piercing bedroom silence; escalating urgency as a midnight/morning deadline looms.

### The Inciting Incident
On Friday at approximately 8:00 PM, someone breached the locked cabinet in the faculty administration annex, stealing:
1. The master answer key for the upcoming midterm exams.
2. The Student Council financial audit folder containing receipts and signed expense waivers.

Maya was briefly near the annex fire exit around 8:10 PM—purely to retrieve her camera from the media lab. She saw nobody, but she accidentally dropped a personal belonging. Now, someone is weaponizing her presence to force her silence.

---

## 3. Characters & Motive Matrix

To ensure that the deduction relies on **logic and information tracking** rather than guessing obvious villains, every single character has a plausible, high-stakes motive for wanting Maya's draft article buried or wanting her framed.

| Character ID | Name & Role | Avatar / Color | Relationship to Maya | Plausible Motive (Why they could be the texter) |
| :--- | :--- | :--- | :--- | :--- |
| `texter` | **Unknown** | `#e11d48` (Rose Red) / `??` | The Blackmailer | Wants Maya's investigative report destroyed; wants Maya to take the fall for the Friday break-in. |
| `chloe` | **Chloe Miller** | `#0284c7` (Sky Blue) / `CM` | Best friend & co-editor of *The Beacon* | Chloe's family faces eviction; winning the state journalism scholarship is her only way to afford college. Maya is currently the top nominee. If Maya is discredited, Chloe automatically receives it. |
| `julian` | **Julian Vance** | `#d97706` (Amber) / `JV` | Ex-boyfriend; Student Council VP | Maya's draft exposé alleges his committee embezzled $4,000 from the spring formal fund. If the story runs, his early admission to Stanford is rescinded. |
| `elena` | **Elena Lin** | `#7c3aed` (Violet) / `EL` | Older stepsister (down the hall) | Elena is on academic probation and desperately needed the stolen midterm answer key to avoid repeating senior year. She deeply resents Maya being the family's "golden child." |
| `henderson` | **Mr. Arthur Henderson** | `#059669` (Emerald) / `AH` | Journalism advisor & English teacher | Henderson signed off on the questionable student council expense vouchers Maya is investigating. An official inquiry will cost him his pending tenure review. |
| `player` | **Maya Lin** | `#10b981` (Teal) / `ME` | Protagonist / Player | Wants to prove her innocence, expose the real culprit, and protect her reporting. |

---

## 4. Systems & Knowledge Tracking

### 4.1 Strict Boolean Variable Design
Variables reflect **epistemic state**—purely whether Maya has revealed specific facts to specific contacts:

```javascript
variables: {
  // Knowledge regarding the dropped physical item (Maya's green knit glove)
  told_chloe_item: 0,
  told_julian_item: 0,
  told_elena_item: 0,
  told_henderson_item: 0,

  // Knowledge regarding the actual timeline (Left at 8:10 PM, not 8:30 PM)
  told_chloe_time: 0,
  told_julian_time: 0,
  told_elena_time: 0,
  told_henderson_time: 0,

  // Knowledge regarding the draft storage (Orange USB flash drive in glovebox vs. cloud)
  told_chloe_drive: 0,
  told_julian_drive: 0,
  told_elena_drive: 0,
  told_henderson_drive: 0,

  // Canary bait flags (planting distinct false leads)
  planted_bait_chloe: 0,
  planted_bait_julian: 0,
  planted_bait_elena: 0,
  planted_bait_henderson: 0,

  // Endgame / Deduction state
  evidence_ready: 0
}
```

### 4.2 The Discrete Information Units (The Facts)

1. **Fact 1: The Dropped Item**
   * *Truth:* Maya dropped a custom green knit glove by the annex fire door.
   * *Gameplay:* Maya can mention the glove, mention a different generic item (like a water bottle), or withhold it completely.
2. **Fact 2: The Timeline Discrepancy**
   * *Truth:* The blackmailer claims she was there at 8:30 PM. Maya actually left at 8:10 PM.
   * *Gameplay:* If Maya points this out to someone, will that person accidentally defend the 8:30 PM timestamp?
3. **Fact 3: The Storage Location of the Draft**
   * *Truth:* The only offline backup of the financial exposé is on an orange flash drive inside Maya's car glove compartment.
   * *Gameplay:* Maya can tell a friend where the file is located—and later notice if the blackmailer demands that specific drive.
4. **Fact 4: The Canary Bait (The Trap)**
   * Maya can choose to feed a distinct false clue to a suspect to see if the Unknown Texter repeats it.

---

## 5. Story Structure & Four-Act Progression

```
[Act I: 9:45 PM]
The First Threat
Unknown texts photos of the school annex.
Demands Maya delete the article draft.
         |
         v
[Act II: 10:05 PM]
Triage & Information Control
Contacts begin messaging Maya for different reasons.
Player chooses who to confide in, who to withhold from, and who to test.
         |
         v
[Act III: 10:45 PM]
The Leaks & The Contradictions
The Unknown Texter references details based on player choices.
A suspect makes an unforced slip-up in ordinary conversation.
         |
         v
[Act IV: 11:15 PM]
Confrontation & Resolution
Player pieces together the contradictory statements.
Direct confrontation: accuse the suspect and cite the exact slip-up.
```

### Act Details

* **Act I: The Ultimatum (9:45 PM – 10:05 PM)**
  * The Unknown number initiates contact: sends an exterior photo of the annex taken from the dark parking lot.
  * The threat is made: *"Drop the budget story by morning, or Principal Ruiz gets the video."*
  * Maya realizes someone is trying to frame her for the exam key theft.

* **Act II: Triage & Selective Disclosure (10:05 PM – 10:45 PM)**
  * Incoming messages arrive naturally:
    * *Julian* asks if the council draft is finished yet and complains about "baseless rumors."
    * *Chloe* asks if Maya wants to collaborate on the final layout and senses Maya is stressed.
    * *Elena* texts from downstairs complaining about family chores and asking why Maya came home late Friday.
    * *Mr. Henderson* sends a reminder about publication review guidelines.
  * The player must choose:
    * Confide in Chloe? Tell her about the orange flash drive?
    * Confront Julian? Mention that she was at the annex?
    * Ask Elena about Friday?

* **Act III: The Trap Snaps (10:45 PM – 11:15 PM)**
  * Conditional branching evaluates the player's choices:
    * If Maya confided in the culprit, the Unknown Texter references that exact detail.
    * The culprit texts Maya in their normal thread and casually brings up a piece of information that *only the blackmailer could know*.
  * The player receives a moment of realization: *They couldn't possibly know that unless they sent the anonymous texts.*

* **Act IV: The Confrontation (11:15 PM – 11:30 PM)**
  * Maya can choose to confront any of the suspects.
  * **Accusation Dialogue Tree:** Maya must specify *both* the accused person and the exact contradictory statement.
  * **Endings:**
    * **True Resolution (The Confession):** The correct suspect is confronted with irrefutable proof. They break down, explain their motive, and the blackmail unravels.
    * **False Accusation (Framed):** Maya accuses an innocent person without proof. The real blackmailer carries out the threat; Maya is suspended; the truth is buried.
    * **Submission Ending:** Maya complies with the blackmailer and deletes her work, living under ongoing threat.

---

## 6. Logic Matrix & Solution Path Design

### Designing the "Airtight Slip-Up"
For the mystery to feel intellectually rewarding:
1. **The Clue must be fair:** The player must have witnessed both the setup and the slip-up in clear text.
2. **The Culprit's Slip must be unmistakable once noticed:** E.g., The blackmailer mentions *"that little orange drive of yours"*, when Maya *only* told Chloe she kept the file on a flash drive, but told Julian it was in cloud storage.
3. **Plausible Deniability eliminated:** The culprit attempts an excuse, but the timeline or prior text records demolish it.

---

## 7. Development Checklist & Next Steps

- [x] High-level concept defined.
- [x] Information-flow / Canary trap mechanic established.
- [x] Suspect cast and motive matrix balanced.
- [x] Game Design Document saved to project repository.
- [ ] Finalize the specific canonical culprit and their exact slip-up dialogue.
- [ ] Write the full dialogue script with conditional engine branches.
- [ ] Create `stories/off-the-record.js` and register in `stories/manifest.json`.
- [ ] Playtest locally using the interactive phone simulator.
