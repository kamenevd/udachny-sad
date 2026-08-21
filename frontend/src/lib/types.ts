import type { Shape } from './geometry'

export type FeatureKind =
  | 'house'
  | 'building'
  | 'bed'
  | 'lawn'
  | 'path'
  | 'hedge'
  | 'tree'
  | 'shrub'
  | 'water'

export type PlantType =
  | 'perennial'
  | 'shrub'
  | 'tree'
  | 'conifer'
  | 'bulb'
  | 'annual'
  | 'vine'
  | 'grass'

export type PlantingStatus = 'growing' | 'dead' | 'moved'

export type EntryType =
  | 'water'
  | 'bloom'
  | 'prune'
  | 'feed'
  | 'disease'
  | 'shelter'
  | 'replant'
  | 'death'
  | 'note'

export interface Plot {
  id: string
  owner: string
  members?: string[]
  name: string
  width: number
  height: number
  created: string
  updated: string
}

export interface Feature {
  id: string
  plot: string
  kind: FeatureKind
  label: string
  shape: Shape
  z: number
  author_email?: string
  created: string
  updated: string
}

export interface Plant {
  id: string
  owner: string
  name: string
  cultivar: string
  ptype: PlantType | ''
  notes: string
  photo: string
  created: string
  updated: string
}

export interface Planting {
  id: string
  plot: string
  plant: string
  feature: string
  x: number
  y: number
  plant_name?: string
  plant_ptype?: PlantType | ''
  author_email?: string
  planted_on: string
  status: PlantingStatus
  ended_on: string
  end_note: string
  created: string
  updated: string
  expand?: {
    plant?: Plant
    feature?: Feature
    plot?: Plot
  }
}

export interface Entry {
  id: string
  planting: string
  etype: EntryType
  happened_on: string
  note: string
  photos: string[]
  author_email?: string
  created: string
  updated: string
  expand?: {
    planting?: Planting
  }
}

export type PlotInviteStatus = 'invited' | 'accepted'

export interface PlotInvite {
  id: string
  plot: string
  email: string
  status: PlotInviteStatus
  user?: string
  invited_by: string
  created: string
  updated: string
  expand?: {
    user?: {
      id: string
      email: string
    }
  }
}
