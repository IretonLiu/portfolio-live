import { create } from 'zustand'

interface GlobeRotationState {
    targetGlobeRotation: {
        theta: number
        phi: number
    }
    setTargetGlobeRotation: (theta: number, phi: number) => void
}

export const useGlobeRotationStore = create<GlobeRotationState>((set) => ({
    targetGlobeRotation: { theta: 0, phi: 0 },
    setTargetGlobeRotation: (theta, phi) =>
        set({ targetGlobeRotation: { theta, phi } }),
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
