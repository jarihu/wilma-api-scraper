import * as cheerio from 'cheerio';

/**
 * Child entry from landing page
 */
export interface ChildEntry {
  id: string;
  name: string | null;
}

/**
 * School and class information for a child
 */
export interface SchoolAndClass {
  schoolName: string | null;
  className: string | null;
}

/**
 * Complete child information with school and class details
 */
export interface ChildWithSchool extends ChildEntry, SchoolAndClass {}

/**
 * Parser utilities for child-related data
 */
export class ChildParser {
  /** Extract child entries and names from Wilma landing page HTML */
  static extractChildEntries(html: string): ChildEntry[] {
    const $ = cheerio.load(html);
    const entries = new Map<string, string | null>();

    // Use exact query for child links: look for <a> tags with href="/!{childId}"
    $('a[href*="/!"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const match = href.match(/\/!([0-9]+)(\/|$)/);
      
      if (match && match[1]) {
        const childId = match[1];
        
        // Extract name by removing <small> and <span> tags
        let name: string | null = null;
        try {
          const $el = $(el);
          const clone = $el.clone();
          clone.find('small').remove();
          clone.find('span').remove();
          name = clone.text().trim() || null;
        } catch (_e) {
          name = null;
        }
        
        entries.set(childId, name);
      }
    });

    return Array.from(entries.entries()).map(([id, name]) => ({ id, name }));
  }
  /**
   * Extract all children with their school and class information from landing page HTML
   * Convenience method that combines extractChildEntries and extractChildSchoolAndClass
   * @param html - The landing page HTML
   * @returns Array of children with id, name, schoolName, and className
   */
  static extractChildren(html: string): ChildWithSchool[] {
    const children = this.extractChildEntries(html);
    return children.map(child => ({
      ...child,
      ...this.extractChildSchoolAndClass(html, child.id)
    }));
  }
  
  /** Extract school name and class name for a specific child from landing page HTML */
  static extractChildSchoolAndClass(html: string, childId: string): SchoolAndClass {
    const $ = cheerio.load(html);
    let schoolName: string | null = null;
    let className: string | null = null;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes(`!${childId}/`)) {
        const $small = $(el).find('small');
        if ($small.length > 0) {
          schoolName = $small.text().trim();
        }

        const $span = $(el).find('span.lem');
        if ($span.length > 0) {
          const spanText = $span.text().trim();
          className = spanText.replace(/^,\s*/, '').trim();
        }
      }
    });

    return { schoolName, className };
  }


}