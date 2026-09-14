# Project Pulse 1.0 Release Candidate Checklist

## Campaign
- [x] Stages 1–8 retained as the proven gameplay foundation
- [x] Stages 9–12: Fracture mechanics (rifts, echo drones, mixed gravity, Hunter Wraith)
- [x] Stages 13–16: Collapse mechanics and final Hunter Prime encounter
- [x] 16-stage HUD/progression handoff
- [x] Persistent ranks, best score, unlock progress and settings
- [x] Continue campaign entry point for the second half
- [x] Concise mechanic reveals for Orange Rift, Echo Drone, Blackout and Hunter Prime

## Platform
- [x] YouTube SDK-first startup path
- [x] Local browser fallback
- [x] Cloud-save abstraction with localStorage fallback
- [x] System pause/resume hooks
- [x] System audio-state hooks
- [x] firstFrameReady/gameReady calls
- [x] Score submission hook
- [x] Continue-campaign music user-gesture path

## Accessibility / UX
- [x] Keyboard, pointer and touch controls
- [x] Reduced-effects toggle
- [x] Separate music and FX controls
- [x] Portrait-safe presentation without stretching the canvas
- [x] First-run control guide
- [x] Act transitions and stage ranks
- [x] Short-screen/mobile menu safety

## Release hygiene
- [x] Legacy game.js and game-v2.js removed from release branch
- [x] JavaScript syntax validation in GitHub Actions
- [x] Required release-file checks
- [x] Bundle-budget validation
- [x] Relative-path validation

## Pre-submission checks still requiring the actual YouTube test environment
- [ ] Run YouTube Playables certification/test suite
- [ ] Validate SDK behavior inside YouTube staging
- [ ] Test representative Android/iOS devices and desktop browsers
- [ ] Verify final zipped bundle/file-name constraints
- [ ] Address any reviewer/test-suite findings before submission

The browser release candidate is feature-complete for final playtesting. The unchecked items require the actual YouTube Playables staging/certification environment and are not claims of certification approval.
