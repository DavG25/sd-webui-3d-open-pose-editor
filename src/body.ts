import * as THREE from 'three'
import { Object3D } from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils'
import type { TupleToUnion } from 'type-fest'
let handFBXFileUrl =
    '/file=extensions/sd-webui-3d-open-pose-editor/models/hand.fbx'
let footFBXFileUrl =
    '/file=extensions/sd-webui-3d-open-pose-editor/models/foot.fbx'
import { LoadFBXFile } from './loader'
import { FindObjectItem } from './three-utils'

const coco_body_keypoints_const = [
    'nose',
    'neck',
    'right_shoulder',
    'right_elbow',
    'right_wrist',
    'left_shoulder',
    'left_elbow',
    'left_wrist',
    'right_hip',
    'right_knee',
    'right_ankle',
    'left_hip',
    'left_knee',
    'left_ankle',
    'right_eye',
    'left_eye',
    'right_ear',
    'left_ear',
] as const

const coco_body_keypoints = coco_body_keypoints_const as unknown as string[]

const connect_keypoints = [
    [1, 2],
    [1, 5],
    [2, 3],
    [3, 4],
    [5, 6],
    [6, 7],
    [1, 8],
    [8, 9],
    [9, 10],
    [1, 11],
    [11, 12],
    [12, 13],
    [0, 1],
    [0, 14],
    [14, 16],
    [0, 15],
    [15, 17],
] as const

const connect_color = [
    [255, 0, 0], // [1, 2], 0
    [255, 85, 0], // [1, 5], 1
    [255, 170, 0], // [2, 3], 2
    [255, 255, 0], // [3, 4], 3
    [170, 255, 0], // [5, 6], 4
    [85, 255, 0], // [6, 7], 5
    [0, 255, 0], // [1, 8], 6
    [0, 255, 85], // [8, 9], 7
    [0, 255, 170], // [9, 10], 8
    [0, 255, 255], // [1, 11], 9
    [0, 170, 255], // [11, 12], 10
    [0, 85, 255], // [12, 13], 11
    [0, 0, 255], // [0, 1], 12
    [85, 0, 255], // [0, 14], 13
    [170, 0, 255], // [14, 16], 14
    [255, 0, 255], // [0, 15], 15
    [255, 0, 170], // [15, 17], 16
    [255, 0, 85], // 17
] as const

const JointRadius = 1

function ToHexColor([r, g, b]: readonly [number, number, number]) {
    return (r << 16) + (g << 8) + b
}
function SearchColor(start: number, end: number) {
    const index = connect_keypoints.findIndex(
        ([s, e]) => s === start && e === end
    )

    if (typeof index !== 'undefined') {
        const [r, g, b] = connect_color[index]

        return (r << 16) + (g << 8) + b
    }
    return null
}

function GetColorOfLinkByName(startName: string, endName: string) {
    if (!startName || !endName) return null

    const indexStart = coco_body_keypoints.indexOf(startName)
    const indexEnd = coco_body_keypoints.indexOf(endName)

    if (indexStart === -1 || indexEnd === -1) return null

    if (indexStart > indexEnd) return SearchColor(indexEnd, indexStart)
    else return SearchColor(indexStart, indexEnd)
}

function GetColorOfLink(start: Object3D, end: Object3D) {
    if (!start.name || !end.name) return null

    return GetColorOfLinkByName(start.name, end.name)
}

function GetPresetColorOfJoint(name: string) {
    const index = coco_body_keypoints.indexOf(name)
    return index !== -1 ? ToHexColor(connect_color[index]) : 0x0
}

function CreateLink(parent: Object3D, endObject: THREE.Object3D) {
    CreateLink2(parent, endObject, new THREE.Vector3(0, 0, 0))
}

function CreateLink2(
    parent: Object3D,
    endObject: THREE.Object3D,
    start: THREE.Object3D | THREE.Vector3
) {
    const startPosition =
        start instanceof THREE.Vector3 ? start.clone() : start.position.clone()
    const endPostion = endObject.position
    const distance = startPosition.distanceTo(endPostion)

    const presetColor = GetColorOfLink(
        start instanceof THREE.Vector3 ? parent : start,
        endObject
    )
    const material = new THREE.MeshBasicMaterial({
        color: presetColor ?? 0x0,
        opacity: 0.6,
        transparent: true,
    })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(JointRadius), material)
    mesh.name = parent.name + '_link_' + endObject.name

    // 将拉伸后的球体放在中点，并计算旋转轴和jiaodu
    const origin = startPosition.clone().add(endPostion).multiplyScalar(0.5)
    const v = endPostion.clone().sub(startPosition)
    const unit = new THREE.Vector3(1, 0, 0)
    const axis = unit.clone().cross(v)
    const angle = unit.clone().angleTo(v)

    mesh.scale.copy(new THREE.Vector3(distance / 2, 1, 1))
    mesh.position.copy(origin)
    mesh.setRotationFromAxisAngle(axis.normalize(), angle)
    parent.add(mesh)
}

function CreateLink4(
    startObject: THREE.Object3D,
    endObject: THREE.Object3D,
    startName: string,
    endName: string
) {
    const startPosition = new THREE.Vector3(0, 0, 0)
    const endPostion = endObject.position
    const distance = startPosition.distanceTo(endPostion)

    const presetColor = GetColorOfLinkByName(startName, endName)
    const material = new THREE.MeshBasicMaterial({
        color: presetColor ?? 0x0,
        opacity: 0.6,
        transparent: true,
    })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(JointRadius), material)
    mesh.name = startName + '_link_' + endName

    // 将拉伸后的球体放在中点，并计算旋转轴和角度
    const origin = startPosition.clone().add(endPostion).multiplyScalar(0.5)
    const v = endPostion.clone().sub(startPosition)
    const unit = new THREE.Vector3(1, 0, 0)
    const axis = unit.clone().cross(v)
    const angle = unit.clone().angleTo(v)

    mesh.scale.copy(new THREE.Vector3(distance / 2, 1, 1))
    mesh.position.copy(origin)
    mesh.setRotationFromAxisAngle(axis.normalize(), angle)
    startObject.add(mesh)
}

function UpdateLink4(
    startObject: Object3D,
    endObject: Object3D,
    startName: string,
    endName: string
) {
    const startPosition = new THREE.Vector3(0, 0, 0)
    const endPostion = endObject.position
    const distance = startPosition.distanceTo(endPostion)
    // 将拉伸后的球体放在中点，并计算旋转轴和角度
    const origin = startPosition.clone().add(endPostion).multiplyScalar(0.5)
    const v = endPostion.clone().sub(startPosition)
    const unit = new THREE.Vector3(1, 0, 0)
    const axis = unit.clone().cross(v)
    const angle = unit.clone().angleTo(v)
    const mesh = startObject.getObjectByName(startName + '_link_' + endName)!
    mesh.scale.copy(new THREE.Vector3(distance / 2, 1, 1))
    mesh.position.copy(origin)
    mesh.setRotationFromAxisAngle(axis.normalize(), angle)
}

function UpdateLink2(startObject: Object3D, endObject: Object3D) {
    UpdateLink4(startObject, endObject, startObject.name, endObject.name)
}

function Joint(name: string) {
    const object = new THREE.Mesh(
        new THREE.SphereGeometry(JointRadius),
        new THREE.MeshBasicMaterial({ color: GetPresetColorOfJoint(name) })
    )
    object.name = name
    return object
}

function Torso(x: number, y: number, z: number) {
    const width = 34
    const height = 46

    const object = new THREE.Group()
    object.name = 'torso'

    object.translateX(x)
    object.translateY(y)
    object.translateZ(z)

    const five = new THREE.Group()
    five.name = 'five'
    five.translateY(height / 2)
    object.add(five)

    const neck = Joint('neck')
    five.add(neck)

    const shoulder = new THREE.Group()
    shoulder.name = 'shoulder'
    five.add(shoulder)

    const right_shoulder = Joint('right_shoulder')
    right_shoulder.translateX(-width / 2)

    const left_shoulder = Joint('left_shoulder')

    left_shoulder.translateX(width / 2)
    x
    shoulder.add(right_shoulder)
    shoulder.add(left_shoulder)

    const hip = new THREE.Group()
    hip.name = 'hip'
    five.add(hip)

    const right_hip = Joint('right_hip')

    right_hip.translateX(-width / 2 + 10)
    right_hip.translateY(-height)

    const left_hip = Joint('left_hip')

    left_hip.translateX(width / 2 - 10)
    left_hip.translateY(-height)

    hip.add(right_hip)
    hip.add(left_hip)

    CreateLink4(hip, right_hip, 'neck', 'right_hip')
    CreateLink4(hip, left_hip, 'neck', 'left_hip')
    CreateLink4(shoulder, right_shoulder, 'neck', 'right_shoulder')
    CreateLink4(shoulder, left_shoulder, 'neck', 'left_shoulder')

    return {
        neck,
        torso: object,
        right_shoulder,
        left_shoulder,
        right_hip,
        left_hip,
    }
}

function Head(x: number, y: number, z: number) {
    const nose = Joint('nose')

    nose.translateX(x)
    nose.translateY(y)
    nose.translateZ(z)

    const right_eye = Joint('right_eye')

    right_eye.translateX(-3)
    right_eye.translateY(3)
    right_eye.translateZ(-3)

    const left_eye = Joint('left_eye')

    left_eye.translateX(3)
    left_eye.translateY(3)
    left_eye.translateZ(-3)

    CreateLink(nose, right_eye)
    CreateLink(nose, left_eye)

    nose.add(right_eye)
    nose.add(left_eye)

    const right_ear = Joint('right_ear')

    right_ear.translateX(-4)
    right_ear.translateY(-3)
    right_ear.translateZ(-8)

    const left_ear = Joint('left_ear')

    left_ear.translateX(4)
    left_ear.translateY(-3)
    left_ear.translateZ(-8)

    CreateLink(right_eye, right_ear)
    CreateLink(left_eye, left_ear)

    right_eye.add(right_ear)
    left_eye.add(left_ear)

    return { nose, right_eye, left_eye, right_ear, left_ear }
}

function Elbow(name: string, x: number, y: number, z: number) {
    const object = Joint(name)
    object.translateX(x)
    object.translateY(y)
    object.translateZ(z)
    return object
}

function Knee(name: string, x: number, y: number, z: number) {
    const object = Joint(name)
    object.translateX(x)
    object.translateY(y)
    object.translateZ(z)
    return object
}

function Ankle(name: string, x: number, y: number, z: number) {
    const object = Joint(name)
    object.translateX(x)
    object.translateY(y)
    object.translateZ(z)
    return object
}

let templateBody: THREE.Group | null = null

export function CloneBody() {
    if (templateBody) {
        return SkeletonUtils.clone(templateBody)
    }
    return null
}

const HandScale = 2.2
const FootScale = 0.25

export function CreateTemplateBody(hand: Object3D, foot: Object3D) {
    const { torso, right_shoulder, left_shoulder, right_hip, left_hip, neck } =
        Torso(0, 115, 0)
    const { nose, left_ear, right_ear, right_eye, left_eye } = Head(0, 20, 14)
    const right_elbow = Elbow('right_elbow', 0, -25, 0)
    const left_elbow = Elbow('left_elbow', 0, -25, 0)
    const right_wrist = Elbow('right_wrist', 0, -25, 0)
    const left_wrist = Elbow('left_wrist', 0, -25, 0)
    const right_knee = Knee('right_knee', 0, -40, 0)
    const left_knee = Knee('left_knee', 0, -40, 0)
    const right_ankle = Ankle('right_ankle', 0, -36, 0)
    const left_ankle = Ankle('left_ankle', 0, -36, 0)

    neck.add(nose)
    right_shoulder.add(right_elbow)
    left_shoulder.add(left_elbow)
    right_elbow.add(right_wrist)
    left_elbow.add(left_wrist)
    right_hip.add(right_knee)
    left_hip.add(left_knee)
    right_knee.add(right_ankle)
    left_knee.add(left_ankle)

    CreateLink(neck, nose)
    CreateLink(right_shoulder, right_elbow)
    CreateLink(left_shoulder, left_elbow)
    CreateLink(right_elbow, right_wrist)
    CreateLink(left_elbow, left_wrist)
    CreateLink(right_hip, right_knee)
    CreateLink(left_hip, left_knee)
    CreateLink(right_knee, right_ankle)
    CreateLink(left_knee, left_ankle)

    const right_hand = SkeletonUtils.clone(hand)
    const left_hand = SkeletonUtils.clone(hand)
    right_hand.name = 'right_hand'
    right_hand.translateX(-0.4)
    right_hand.translateY(3)
    right_hand.rotateY(Math.PI)
    right_hand.rotateZ(-Math.PI / 2)

    right_hand.scale.multiplyScalar(HandScale)

    left_hand.name = 'left_hand'
    left_hand.scale.x = -1
    left_hand.translateX(0.4)
    left_hand.translateY(3)
    left_hand.rotateY(Math.PI)
    left_hand.rotateZ(Math.PI / 2)
    left_hand.scale.multiplyScalar(HandScale)

    right_wrist.add(right_hand)
    left_wrist.add(left_hand)

    const right_foot = SkeletonUtils.clone(foot)
    const left_foot = SkeletonUtils.clone(foot)

    right_foot.name = 'right_foot'
    right_foot.scale.setX(-1)
    right_foot.scale.multiplyScalar(FootScale)

    left_foot.name = 'left_foot'
    left_foot.scale.multiplyScalar(FootScale)

    right_ankle.add(right_foot)
    left_ankle.add(left_foot)
    templateBody = torso
}

const handModelInfo = {
    meshName: 'shoupolySurface1',
    bonePrefix: 'shoujoint',
}
const footModelInfo = {
    meshName: 'FootObject',
    bonePrefix: 'FootBone',
}

const ExtremitiesMapping: Record<
    string,
    {
        meshName: string
        bonePrefix: string
    }
> = {
    left_hand: handModelInfo,
    right_hand: handModelInfo,
    left_foot: footModelInfo,
    right_foot: footModelInfo,
}
export async function LoadHand(onLoading?: (loaded: number) => void) {
    const fbx = await LoadFBXFile(handFBXFileUrl, onLoading)

    // fbx.scale.multiplyScalar(10)
    const mesh = FindObjectItem<THREE.SkinnedMesh>(fbx, handModelInfo.meshName)!
    mesh.material = new THREE.MeshPhongMaterial()
    // this.scene.add();
    // const helper = new THREE.SkeletonHelper(mesh.parent!);
    // this.scene.add(helper);
    mesh.skeleton.bones.forEach((o) => {
        const point = new THREE.Mesh(
            new THREE.SphereGeometry(0.5),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        )
        point.name = 'red_point'
        point.scale.setX(0.2)
        point.position.copy(o.position)
        o.add(point)
    })

    return fbx
}

export async function LoadFoot(onLoading?: (loaded: number) => void) {
    const fbx = await LoadFBXFile(footFBXFileUrl, onLoading)

    console.log(fbx)
    // fbx.scale.multiplyScalar(0.001)

    const mesh = FindObjectItem<THREE.SkinnedMesh>(fbx, footModelInfo.meshName)!
    mesh.material = new THREE.MeshPhongMaterial()
    // this.scene.add();
    // const helper = new THREE.SkeletonHelper(mesh.parent!);
    // this.scene.add(helper);

    console.log(mesh.skeleton.bones)
    mesh.skeleton.bones.forEach((o) => {
        if (o.name !== 'FootBone2') return
        const point = new THREE.Mesh(
            new THREE.SphereGeometry(0.1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        )

        point.name = 'red_point'
        point.position.copy(o.position)
        point.translateX(-0.3)
        o.add(point)
    })

    return fbx
}

export function GetExtremityMesh(o: Object3D) {
    if (!(o.name in ExtremitiesMapping)) {
        return null
    }
    return FindObjectItem<THREE.SkinnedMesh>(
        o,
        ExtremitiesMapping[o.name].meshName
    )
}

export function IsNeedSaveObject(name: string) {
    if (coco_body_keypoints.includes(name)) return true
    if (name === 'right_hand' || name === 'left_hand') return true
    if (name === 'right_foot' || name === 'left_foot') return true
    if (name === 'shoulder' || name === 'hip') return true // virtual point
    if (name.startsWith(handModelInfo.bonePrefix)) return true
    if (name.startsWith(footModelInfo.bonePrefix)) return true

    if (name.includes('_link_')) return true
    return false
}

const pickableObjectNames: string[] = [
    'torso',
    'neck',
    'right_shoulder',
    'left_shoulder',
    'right_elbow',
    'left_elbow',
    'right_hip',
    'left_hip',
    'right_knee',
    'left_knee',
    // virtual point for better control
    'shoulder',
    'hip',
]

export function IsPickable(name: string) {
    if (pickableObjectNames.includes(name)) return true
    if (name.startsWith(handModelInfo.bonePrefix)) return true
    if (name.startsWith(footModelInfo.bonePrefix)) return true

    return false
}

export function IsHand(name: string) {
    return ['left_hand', 'right_hand'].includes(name)
}

export function IsFoot(name: string) {
    return ['left_foot', 'right_foot'].includes(name)
}

export function IsExtremities(name: string) {
    return ['left_hand', 'right_hand', 'left_foot', 'right_foot'].includes(name)
}

type ControlPartName =
    | TupleToUnion<typeof coco_body_keypoints_const>
    | 'hip'
    | 'shoulder'
    | 'five'
    | 'right_hand'
    | 'left_hand'
    | 'left_foot'
    | 'right_foot'
    | 'torso'
export class BodyControlor {
    body: Object3D
    part: Record<ControlPartName, Object3D> = {} as any
    constructor(o: Object3D) {
        this.body = o
        this.body.traverse((o) => {
            if (coco_body_keypoints.includes(o.name as any)) {
                this.part[
                    o.name as TupleToUnion<typeof coco_body_keypoints_const>
                ] = o
            }
        })
        this.part['hip'] = this.body.getObjectByName('hip')!
        this.part['shoulder'] = this.body.getObjectByName('shoulder')!
        this.part['five'] = this.body.getObjectByName('five')!
        this.part['right_hand'] = this.body.getObjectByName('right_hand')!
        this.part['left_hand'] = this.body.getObjectByName('left_hand')!
        this.part['right_foot'] = this.body.getObjectByName('right_foot')!
        this.part['left_foot'] = this.body.getObjectByName('left_foot')!
        this.part['torso'] = this.body
    }

    getWorldPosition(o: Object3D) {
        const pos = new THREE.Vector3()
        o.getWorldPosition(pos)
        return pos
    }

    UpdateLink(name: ControlPartName) {
        switch (name) {
            case 'left_hip':
                UpdateLink4(
                    this.part['hip'],
                    this.part['left_hip'],
                    'neck',
                    'left_hip'
                )
                break
            case 'right_hip':
                UpdateLink4(
                    this.part['hip'],
                    this.part['right_hip'],
                    'neck',
                    'right_hip'
                )
                break
            case 'right_shoulder':
                UpdateLink4(
                    this.part['shoulder'],
                    this.part['right_shoulder'],
                    'neck',
                    'right_shoulder'
                )
                break
            case 'left_shoulder':
                UpdateLink4(
                    this.part['shoulder'],
                    this.part['left_shoulder'],
                    'neck',
                    'left_shoulder'
                )
                break
            case 'torso':
                break
            case 'five':
                break
            case 'neck':
                break
            case 'shoulder':
                break
            case 'right_hand':
                break
            case 'left_hand':
                break
            case 'hip':
                break
            case 'right_foot':
                break
            case 'left_foot':
                break
            default:
                UpdateLink2(this.part[name].parent!, this.part[name])
                break
        }
    }

    get HeadSize() {
        const size = this.getWorldPosition(this.part['right_ear']).distanceTo(
            this.getWorldPosition(this.part['left_ear'])
        )
        return size
    }

    set HeadSize(value: number) {
        const scale = value / this.HeadSize

        const earLength = this.part['left_ear'].position.length() * scale
        const eyeLength = this.part['left_eye'].position.length() * scale

        this.part['left_ear'].position.normalize().multiplyScalar(earLength)
        this.part['right_ear'].position.normalize().multiplyScalar(earLength)
        this.part['left_eye'].position.normalize().multiplyScalar(eyeLength)
        this.part['right_eye'].position.normalize().multiplyScalar(eyeLength)

        this.UpdateLink('left_eye')
        this.UpdateLink('right_eye')
        this.UpdateLink('left_ear')
        this.UpdateLink('right_ear')
    }
    get NoseToNeck() {
        return this.part['nose'].position.length()
    }
    set NoseToNeck(value: number) {
        this.part['nose'].position.normalize().multiplyScalar(value)
        this.UpdateLink('nose')
    }
    get ShoulderToHip() {
        return this.part['five'].position.length() * 2
    }
    set ShoulderToHip(value: number) {
        this.part['five'].position.setY(value / 2)
        this.part['left_hip'].position.setY(-value)
        this.part['right_hip'].position.setY(-value)

        this.UpdateLink('left_hip')
        this.UpdateLink('right_hip')
    }
    get ShoulderWidth() {
        return this.part['left_shoulder'].position.distanceTo(
            this.part['right_shoulder'].position
        )
    }
    set ShoulderWidth(width: number) {
        const right_shoulder = this.part['right_shoulder']
        right_shoulder.position.x = -width / 2
        const left_shoulder = this.part['left_shoulder']
        left_shoulder.position.x = width / 2

        this.UpdateLink('right_shoulder')
        this.UpdateLink('left_shoulder')
    }

    get UpperArm() {
        return this.part['left_elbow'].position.length()
    }
    set UpperArm(length: number) {
        this.part['left_elbow'].position.normalize().multiplyScalar(length)
        this.part['right_elbow'].position.normalize().multiplyScalar(length)
        this.UpdateLink('left_elbow')
        this.UpdateLink('right_elbow')
    }
    get Forearm() {
        return this.part['left_wrist'].position.length()
    }
    set Forearm(length: number) {
        this.part['left_wrist'].position.normalize().multiplyScalar(length)
        this.part['right_wrist'].position.normalize().multiplyScalar(length)

        this.UpdateLink('left_wrist')
        this.UpdateLink('right_wrist')
    }

    get ArmLength() {
        return this.UpperArm + this.Forearm
    }
    set ArmLength(length: number) {
        const origin = this.ArmLength
        this.UpperArm = (length * this.UpperArm) / origin
        this.Forearm = (length * this.Forearm) / origin
    }

    get Thigh() {
        return this.part['left_knee'].position.length()
    }
    set Thigh(length: number) {
        this.part['left_knee'].position.normalize().multiplyScalar(length)
        this.part['right_knee'].position.normalize().multiplyScalar(length)

        this.UpdateLink('left_knee')
        this.UpdateLink('right_knee')
    }

    get HandSize() {
        return Math.abs(this.part['left_hand'].scale.x) / HandScale
    }
    set HandSize(size: number) {
        const origin = this.HandSize
        this.part['left_hand'].scale
            .divideScalar(origin * HandScale)
            .multiplyScalar(size * HandScale)
        this.part['right_hand'].scale
            .divideScalar(origin * HandScale)
            .multiplyScalar(size * HandScale)
    }

    get Hips() {
        return Math.abs(this.part['left_hip'].position.x) * 2
    }
    set Hips(width: number) {
        this.part['left_hip'].position.setX(width / 2)
        this.part['right_hip'].position.setX(-width / 2)
        this.UpdateLink('left_hip')
        this.UpdateLink('right_hip')
    }
    get LowerLeg() {
        return this.part['left_ankle'].position.length()
    }
    set LowerLeg(length: number) {
        this.part['left_ankle'].position.normalize().multiplyScalar(length)
        this.part['right_ankle'].position.normalize().multiplyScalar(length)

        this.UpdateLink('left_ankle')
        this.UpdateLink('right_ankle')
    }

    get LegLength() {
        return this.Thigh + this.LowerLeg
    }
    set LegLength(length: number) {
        const origin = this.LegLength
        this.Thigh = (length * this.Thigh) / origin
        this.LowerLeg = (length * this.LowerLeg) / origin
    }

    get FootSize() {
        return Math.abs(this.part['left_foot'].scale.x) / FootScale
    }
    set FootSize(size: number) {
        const origin = this.FootSize
        this.part['left_foot'].scale
            .divideScalar(origin * FootScale)
            .multiplyScalar(size * FootScale)
        this.part['right_foot'].scale
            .divideScalar(origin * FootScale)
            .multiplyScalar(size * FootScale)
    }
    getLocalPosition(obj: Object3D, postion: THREE.Vector3) {
        return obj.worldToLocal(postion.clone())
    }

    getDirectionVectorByParentOf(
        name: ControlPartName,
        from: THREE.Vector3,
        to: THREE.Vector3
    ) {
        const parent = this.part[name].parent!
        const localFrom = this.getLocalPosition(parent, from)
        const localTo = this.getLocalPosition(parent, to)

        return localTo.clone().sub(localFrom).normalize()
    }

    rotateTo(name: ControlPartName, dir: THREE.Vector3) {
        const obj = this.part[name]
        const unit = obj.position.clone().normalize()
        const axis = unit.clone().cross(dir)
        const angle = unit.clone().angleTo(dir)
        obj.parent?.setRotationFromAxisAngle(axis.normalize(), angle)
    }
    setDirectionVector(name: ControlPartName, v: THREE.Vector3) {
        const len = this.part[name].position.length()
        this.part[name].position.copy(v).multiplyScalar(len)
        this.UpdateLink(name)
    }

    getDistanceOf(from: THREE.Vector3, to: THREE.Vector3) {
        return from.distanceTo(to)
    }
    ResetPose() {
        templateBody?.traverse((o) => {
            if (o.name in this.part) {
                const name = o.name as ControlPartName
                this.part[name].position.copy(o.position)
                this.part[name].rotation.copy(o.rotation)
                this.part[name].scale.copy(o.scale)
                this.UpdateLink(name)
            }
        })
    }
    SetPose(rawData: [number, number, number][]) {
        this.ResetPose()

        const data = Object.fromEntries(
            Object.entries(PartIndexMappingOfPoseModel).map(([name, index]) => {
                return [
                    name,
                    new THREE.Vector3().fromArray(rawData[index] ?? [0, 0, 0]),
                ]
            })
        ) as Record<keyof typeof PartIndexMappingOfPoseModel, THREE.Vector3>

        this.part['torso'].position.copy(
            data['Hips'].clone().add(data['Chest']).multiplyScalar(0.5)
        )

        this.Hips = this.getDistanceOf(data['Hips'], data['UpLeg_L']) * 2
        this.Thigh = this.getDistanceOf(data['UpLeg_L'], data['Leg_L'])
        this.LowerLeg = this.getDistanceOf(data['Leg_L'], data['Foot_L'])
        this.UpperArm = this.getDistanceOf(data['Arm_L'], data['ForeArm_L'])
        this.Forearm = this.getDistanceOf(data['ForeArm_L'], data['Hand_L'])
        this.ShoulderWidth =
            2 *
            (this.getDistanceOf(data['Shoulder_L'], data['Arm_L']) +
                this.getDistanceOf(data['Chest'], data['Shoulder_L']) /
                    Math.SQRT2)

        const map: [
            ControlPartName,
            [
                keyof typeof PartIndexMappingOfPoseModel,
                keyof typeof PartIndexMappingOfPoseModel
            ]
        ][] = [
            ['five', ['Hips', 'Chest']],
            ['left_elbow', ['Arm_L', 'ForeArm_L']],
            ['left_wrist', ['ForeArm_L', 'Hand_L']],
            ['left_knee', ['UpLeg_L', 'Leg_L']],
            ['left_ankle', ['Leg_L', 'Foot_L']],
            ['right_elbow', ['Arm_R', 'ForeArm_R']],
            ['right_wrist', ['ForeArm_R', 'Hand_R']],
            ['right_knee', ['UpLeg_R', 'Leg_R']],
            ['right_ankle', ['Leg_R', 'Foot_R']],
        ]

        for (const [name, [from, to]] of map)
            this.rotateTo(
                name,
                this.getDirectionVectorByParentOf(name, data[from], data[to])
            )
    }
}

const PartIndexMappingOfPoseModel = {
    Root: 0,
    Hips: 1,
    Spine: 2,
    Spine1: 3,
    Spine2: 4,
    Chest: 5,
    Neck: 6,
    Head: 7,
    Eye_R: 8,
    Eye_L: 9,
    Head_Null: 10, // maybe null
    Shoulder_L: 11,
    Arm_L: 12,
    ForeArm_L: 13,
    Hand_L: 14,
    HandPinky1_L: 15,
    HandPinky2_L: 16,
    HandPinky3_L: 17,
    HandRing1_L: 18,
    HandRing2_L: 19,
    HandRing3_L: 20,
    HandMiddle1_L: 21,
    HandMiddle2_L: 22,
    HandMiddle3_L: 23,
    HandIndex1_L: 24,
    HandIndex2_L: 25,
    HandIndex3_L: 26,
    HandThumb1_L: 27,
    HandThumb2_L: 28,
    HandThumb3_L: 29,
    Elbow_L: 30,
    ForeArmTwist_L: 31,
    ArmTwist_L: 32,
    Shoulder_R: 33,
    Arm_R: 34,
    ForeArm_R: 35,
    Hand_R: 36,
    HandPinky1_R: 37,
    HandPinky2_R: 38,
    HandPinky3_R: 39,
    HandRing1_R: 40,
    HandRing2_R: 41,
    HandRing3_R: 42,
    HandMiddle1_R: 43,
    HandMiddle2_R: 44,
    HandMiddle3_R: 45,
    HandIndex1_R: 46,
    HandIndex2_R: 47,
    HandIndex3_R: 48,
    HandThumb1_R: 49,
    HandThumb2_R: 50,
    HandThumb3_R: 51,
    Elbow_R: 52,
    ForeArmTwist_R: 53,
    ArmTwist_R: 54,
    UpLeg_L: 55,
    Leg_L: 56,
    Knee_L: 57,
    Foot_L: 58,
    FootPinky1_L: 59,
    FootRing_L: 60,
    FootMiddle_L: 61,
    FootIndex_L: 62,
    FootThumb_L: 63,
    UpLegTwist_L: 64,
    ThighFront_L: 65,
    UpLeg_R: 66,
    Leg_R: 67,
    Knee_R: 68,
    Foot_R: 69,
    FootPinky1_R: 70,
    FootRing_R: 71,
    FootMiddle_R: 72,
    FootIndex_R: 73,
    FootThumb_R: 74,
    UpLegTwist_R: 75,
    ThighFront_R: 76,
}

let PosesLibraryUrl =
    '/file=extensions/sd-webui-3d-open-pose-editor/src/poses/data.bin'

const PosesLibrary: [number, number, number][][] | null = []

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export function GetRandomPose() {
    if (PosesLibrary)
        return PosesLibrary[getRandomInt(0, PosesLibrary.length - 1)]
    return null
}

export async function LoadPosesLibrary() {
    const response = await fetch(PosesLibraryUrl)
    const buffer = await response.arrayBuffer()

    console.log(buffer.byteLength)
    const int16Array = new Int32Array(buffer)

    const num = Object.keys(PartIndexMappingOfPoseModel).length

    for (let i = 0; i < int16Array.length / (num * 3); i++) {
        const temp: [number, number, number][] = []
        for (let j = 0; j < num; j++) {
            const a = int16Array[i * (num * 3) + j * 3 + 0]
            const b = int16Array[i * (num * 3) + j * 3 + 1]
            const c = int16Array[i * (num * 3) + j * 3 + 2]

            temp.push([a / 1000.0, b / 1000.0, c / 1000.0])
        }

        PosesLibrary?.push(temp)
    }
}

export function setFilePath(
    handFBXFilePath: string,
    footFBXFilePath: string,
    posesLibraryPath: string
) {
    handFBXFileUrl = `/file=${handFBXFilePath}`
    footFBXFileUrl = `/file=${footFBXFilePath}`
    PosesLibraryUrl = `/file=${posesLibraryPath}`
}
