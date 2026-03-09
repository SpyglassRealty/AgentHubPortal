import { db } from "./db";
import { callDutySlots, callDutyHolidays } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface ShiftDefinition {
  type: 'morning' | 'midday' | 'evening';
  startTime: string;
  endTime: string;
}

const SHIFT_DEFINITIONS: ShiftDefinition[] = [
  { type: 'morning', startTime: '08:00', endTime: '12:00' },
  { type: 'midday', startTime: '12:00', endTime: '16:00' },
  { type: 'evening', startTime: '16:00', endTime: '20:00' }
];

/**
 * Generates Call Duty slots for a complete week (7 days x 3 shifts = 21 slots)
 * 
 * @param startDate - The start date of the week (typically Monday)
 * @returns Promise<number> - Number of slots created
 */
export async function generateSlotsForWeek(startDate: Date): Promise<number> {
  let slotsCreated = 0;
  
  try {
    console.log(`[SlotGeneration] Generating slots for week starting ${startDate.toISOString().split('T')[0]}`);
    
    // Get all holidays to check against
    const holidays = await db
      .select({ date: callDutyHolidays.date })
      .from(callDutyHolidays);
    
    const holidayDates = new Set(
      holidays.map(h => h.date.toISOString().split('T')[0])
    );
    
    // Generate slots for 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Skip if this date is a holiday
      if (holidayDates.has(dateString)) {
        console.log(`[SlotGeneration] Skipping ${dateString} - holiday`);
        continue;
      }
      
      // Generate 3 shifts for this day
      for (const shift of SHIFT_DEFINITIONS) {
        // Check if slot already exists for this date/shift
        const existingSlots = await db
          .select()
          .from(callDutySlots)
          .where(
            and(
              eq(callDutySlots.date, currentDate),
              eq(callDutySlots.shiftType, shift.type)
            )
          );
        
        if (existingSlots.length > 0) {
          console.log(`[SlotGeneration] Slot already exists: ${dateString} ${shift.type}`);
          continue;
        }
        
        // Create new slot
        await db.insert(callDutySlots).values({
          date: currentDate,
          shiftType: shift.type,
          startTime: shift.startTime,
          endTime: shift.endTime,
          maxSignups: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        slotsCreated++;
        console.log(`[SlotGeneration] Created slot: ${dateString} ${shift.type} (${shift.startTime}-${shift.endTime})`);
      }
    }
    
    console.log(`[SlotGeneration] Week generation complete. Created ${slotsCreated} slots.`);
    return slotsCreated;
    
  } catch (error) {
    console.error('[SlotGeneration] Error generating slots for week:', error);
    throw error;
  }
}

/**
 * Generates slots for multiple weeks if needed
 * 
 * @param weeksToGenerate - Number of weeks to generate from start date
 * @param startDate - The start date (defaults to next Monday)
 * @returns Promise<number> - Total number of slots created
 */
export async function generateSlotsForMultipleWeeks(
  weeksToGenerate: number = 1, 
  startDate?: Date
): Promise<number> {
  let totalSlotsCreated = 0;
  
  // Default to next Monday if no start date provided
  const baseDate = startDate || getNextMonday();
  
  for (let week = 0; week < weeksToGenerate; week++) {
    const weekStartDate = new Date(baseDate);
    weekStartDate.setDate(baseDate.getDate() + (week * 7));
    
    const weekSlots = await generateSlotsForWeek(weekStartDate);
    totalSlotsCreated += weekSlots;
  }
  
  return totalSlotsCreated;
}

/**
 * Helper function to get the next Monday date
 */
function getNextMonday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilMonday = dayOfWeek === 1 ? 7 : ((1 + 7 - dayOfWeek) % 7);
  
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0); // Start of day
  
  return nextMonday;
}