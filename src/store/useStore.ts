import { create } from 'zustand'

interface GlobeRotationState {
    targetGlobeRotation: {
        theta: number
        phi: number
    }
    targetGlobeRotationVersion: number
    setTargetGlobeRotation: (theta: number, phi: number) => void
}

export const useGlobeRotationStore = create<GlobeRotationState>((set) => ({
    targetGlobeRotation: { theta: 0, phi: 0 },
    targetGlobeRotationVersion: 0,
    setTargetGlobeRotation: (theta, phi) =>
        set((state) => ({
            targetGlobeRotation: { theta, phi },
            targetGlobeRotationVersion: state.targetGlobeRotationVersion + 1,
        })),
}))

interface PointerAnimationState {
    pointerAnimationCounter: number
    increasePointerAnimationCounter: () => void
}

export const usePointerAnimationStore = create<PointerAnimationState>(
    (set) => ({
        pointerAnimationCounter: 0,
        increasePointerAnimationCounter: () =>
            set((state) => ({
                pointerAnimationCounter: state.pointerAnimationCounter + 1,
            })),
    })
)
