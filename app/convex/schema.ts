import { defineSchema, defineTable } from "./_generated/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()),
    locale: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  gardens: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    boundary: v.optional(
      v.object({
        points: v.array(v.array(v.number())),
      }),
    ),
    originGps: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    canvasConfig: v.optional(
      v.object({
        scale: v.optional(v.number()),
        background: v.optional(v.string()),
        unitLabel: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  schemaObjects: defineTable({
    gardenId: v.id("gardens"),
    // building | greenhouse | lawn | path | bed | flowerbed | tree | shrub | water | gate | other
    type: v.string(),
    label: v.optional(v.string()),
    geometry: v.object({
      type: v.string(),
      points: v.array(v.array(v.number())),
    }),
    style: v.optional(
      v.object({
        color: v.optional(v.string()),
        fillColor: v.optional(v.string()),
        strokeWidth: v.optional(v.number()),
        icon: v.optional(v.string()),
      }),
    ),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_garden", ["gardenId"])
    .index("by_garden_and_type", ["gardenId", "type"]),

  lightZones: defineTable({
    gardenId: v.id("gardens"),
    name: v.optional(v.string()),
    geometry: v.object({
      points: v.array(v.array(v.number())),
    }),
    condition: v.string(),
    style: v.optional(
      v.object({
        color: v.optional(v.string()),
        opacity: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_garden", ["gardenId"]),

  moistureZones: defineTable({
    gardenId: v.id("gardens"),
    name: v.optional(v.string()),
    geometry: v.object({
      points: v.array(v.array(v.number())),
    }),
    condition: v.string(),
    style: v.optional(
      v.object({
        color: v.optional(v.string()),
        opacity: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_garden", ["gardenId"]),

  plants: defineTable({
    userId: v.id("users"),
    plantType: v.string(),
    name: v.string(),
    variety: v.optional(v.string()),
    description: v.optional(v.string()),
    catalogId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  plantings: defineTable({
    gardenId: v.id("gardens"),
    plantId: v.id("plants"),
    schemaObjectId: v.optional(v.id("schemaObjects")),
    positionNote: v.optional(v.string()),
    plantedAt: v.number(),
    status: v.string(),
    endedAt: v.optional(v.number()),
    relocatedToPlantingId: v.optional(v.id("plantings")),
    quantity: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_garden", ["gardenId"])
    .index("by_garden_and_status", ["gardenId", "status"])
    .index("by_schema_object", ["schemaObjectId", "plantedAt"])
    .index("by_plant", ["plantId"]),

  journalEvents: defineTable({
    plantingId: v.id("plantings"),
    eventType: v.string(),
    eventDate: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        weather: v.optional(
          v.object({
            temperature: v.optional(v.number()),
            condition: v.optional(v.string()),
          }),
        ),
        harvest: v.optional(
          v.object({
            quantity: v.optional(v.number()),
            unit: v.optional(v.string()),
          }),
        ),
        diagnosis: v.optional(v.string()),
        severity: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_planting", ["plantingId", "eventDate"])
    .index("by_planting_and_type", ["plantingId", "eventType"]),

  photos: defineTable({
    ownerType: v.string(),
    ownerId: v.string(),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerType", "ownerId"])
    .index("by_storage", ["storageId"]),
});
