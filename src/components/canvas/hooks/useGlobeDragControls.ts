import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    type MutableRefObject,
    type RefObject,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RaySphereIntersection } from '../Utils'
import { useGlobeRotationStore } from '../../../store/useStore'

interface GlobeDragControlsOptions {
    enabled: boolean
    globeRef: RefObject<THREE.Mesh | null>
    globePosition: THREE.Vector3
    radius: number
    sensitivity?: number
    damping?: number
    onManualSpinStart?: () => void
}

interface GlobeDragControlsApi {
    isActiveRef: MutableRefObject<boolean>
    isDraggingRef: MutableRefObject<boolean>
    cancel: () => void
}

const MIN_INERTIA_SPEED = 0.015

export const useGlobeDragControls = ({
    enabled,
    globeRef,
    globePosition,
    radius,
    sensitivity = 4.5,
    damping = 0.92,
    onManualSpinStart,
}: GlobeDragControlsOptions): GlobeDragControlsApi => {
    const { camera, gl } = useThree()
    const targetVersion = useGlobeRotationStore(
        (state) => state.targetGlobeRotationVersion
    )

    const isActiveRef = useRef(false)
    const isDraggingRef = useRef(false)
    const activePointerId = useRef<number | null>(null)
    const previousPointer = useMemo(() => new THREE.Vector2(), [])
    const currentPointer = useMemo(() => new THREE.Vector2(), [])
    const pointerDelta = useMemo(() => new THREE.Vector2(), [])
    const rayOrigin = useMemo(() => new THREE.Vector3(), [])
    const rayDir = useMemo(() => new THREE.Vector3(), [])
    const hitPoint = useMemo(() => new THREE.Vector3(), [])
    const dragNormal = useMemo(() => new THREE.Vector3(0, 0, 1), [])
    const cameraRight = useMemo(() => new THREE.Vector3(), [])
    const cameraUp = useMemo(() => new THREE.Vector3(), [])
    const tangentDelta = useMemo(() => new THREE.Vector3(), [])
    const angularVelocity = useMemo(() => new THREE.Vector3(), [])
    const dragRotation = useMemo(() => new THREE.Quaternion(), [])
    const inertiaAxis = useMemo(() => new THREE.Vector3(), [])
    const lastMoveTime = useRef(0)
    const onManualSpinStartRef = useRef(onManualSpinStart)

    useEffect(() => {
        onManualSpinStartRef.current = onManualSpinStart
    }, [onManualSpinStart])

    const cancel = useCallback(() => {
        isDraggingRef.current = false
        isActiveRef.current = false
        activePointerId.current = null
        angularVelocity.set(0, 0, 0)
    }, [angularVelocity])

    // Experience-location clicks issue a new target-rotation command. That
    // command wins over any manual drag/inertia, so the old spin never fights
    // the store-driven location animation.
    useEffect(() => {
        cancel()
    }, [cancel, targetVersion])

    useEffect(() => {
        if (!enabled) {
            cancel()
            return
        }

        const domElement = gl.domElement

        const setPointerFromEvent = (
            event: PointerEvent,
            target: THREE.Vector2
        ) => {
            const rect = domElement.getBoundingClientRect()
            target.set(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            )
        }

        const intersectGlobe = (pointer: THREE.Vector2) => {
            camera.updateMatrixWorld()
            rayOrigin.copy(camera.position)
            rayDir
                .set(pointer.x, pointer.y, 0.0)
                .unproject(camera)
                .sub(rayOrigin)
                .normalize()

            const tHit = RaySphereIntersection(
                rayOrigin,
                rayDir,
                globePosition,
                radius
            )

            if (tHit <= 0) return false

            hitPoint.copy(rayOrigin).addScaledVector(rayDir, tHit)
            dragNormal.copy(hitPoint).sub(globePosition).normalize()
            return true
        }

        const applyDragDelta = (delta: THREE.Vector2, dt: number) => {
            const globe = globeRef.current
            if (!globe || delta.lengthSq() === 0) return

            cameraRight.setFromMatrixColumn(camera.matrixWorld, 0)
            cameraUp.setFromMatrixColumn(camera.matrixWorld, 1)
            tangentDelta
                .copy(cameraRight)
                .multiplyScalar(delta.x)
                .addScaledVector(cameraUp, delta.y)

            // Keep the screen-space movement tangent to the grabbed point on
            // the sphere. This gives angular velocity equivalent to mouse
            // velocity along the globe surface, scaled by sensitivity.
            tangentDelta.addScaledVector(
                dragNormal,
                -tangentDelta.dot(dragNormal)
            )

            const tangentLength = tangentDelta.length()
            if (tangentLength === 0) return

            const axis = angularVelocity
                .copy(dragNormal)
                .cross(tangentDelta)
                .normalize()
            const angle = tangentLength * sensitivity

            dragRotation.setFromAxisAngle(axis, angle)
            globe.quaternion.premultiply(dragRotation)

            angularVelocity
                .copy(axis)
                .multiplyScalar(angle / Math.max(dt, 1 / 120))
            isActiveRef.current = true
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (event.button !== 0) return

            setPointerFromEvent(event, previousPointer)
            if (!intersectGlobe(previousPointer)) return

            event.preventDefault()
            activePointerId.current = event.pointerId
            isDraggingRef.current = true
            isActiveRef.current = true
            angularVelocity.set(0, 0, 0)
            lastMoveTime.current = event.timeStamp
            domElement.setPointerCapture?.(event.pointerId)

            const callback = onManualSpinStartRef.current
            if (callback) window.setTimeout(callback, 0)
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (
                !isDraggingRef.current ||
                activePointerId.current !== event.pointerId
            ) {
                return
            }

            setPointerFromEvent(event, currentPointer)
            intersectGlobe(currentPointer)

            pointerDelta.copy(currentPointer).sub(previousPointer)
            const dt = (event.timeStamp - lastMoveTime.current) / 1000
            applyDragDelta(pointerDelta, dt)

            previousPointer.copy(currentPointer)
            lastMoveTime.current = event.timeStamp
        }

        const handlePointerUp = (event: PointerEvent) => {
            if (activePointerId.current !== event.pointerId) return

            isDraggingRef.current = false
            activePointerId.current = null
            domElement.releasePointerCapture?.(event.pointerId)
        }

        domElement.addEventListener('pointerdown', handlePointerDown)
        domElement.addEventListener('pointermove', handlePointerMove)
        domElement.addEventListener('pointerup', handlePointerUp)
        domElement.addEventListener('pointercancel', handlePointerUp)

        return () => {
            domElement.removeEventListener('pointerdown', handlePointerDown)
            domElement.removeEventListener('pointermove', handlePointerMove)
            domElement.removeEventListener('pointerup', handlePointerUp)
            domElement.removeEventListener('pointercancel', handlePointerUp)
            cancel()
        }
    }, [
        camera,
        gl,
        enabled,
        globeRef,
        globePosition,
        radius,
        sensitivity,
        previousPointer,
        currentPointer,
        pointerDelta,
        rayOrigin,
        rayDir,
        hitPoint,
        dragNormal,
        cameraRight,
        cameraUp,
        tangentDelta,
        angularVelocity,
        dragRotation,
        cancel,
    ])

    useFrame((_, delta) => {
        if (!enabled) return

        const globe = globeRef.current
        if (!globe) return

        if (isDraggingRef.current) {
            isActiveRef.current = true
            return
        }

        const speed = angularVelocity.length()
        if (speed < MIN_INERTIA_SPEED) {
            angularVelocity.set(0, 0, 0)
            isActiveRef.current = false
            return
        }

        inertiaAxis.copy(angularVelocity).normalize()
        dragRotation.setFromAxisAngle(inertiaAxis, speed * delta)
        globe.quaternion.premultiply(dragRotation)
        angularVelocity.multiplyScalar(Math.pow(damping, delta * 60))
        isActiveRef.current = true
    })

    return { isActiveRef, isDraggingRef, cancel }
}
