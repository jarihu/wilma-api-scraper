import { describe, it, expect } from 'vitest';
import { ChildParser } from '../src/parser';

describe('ChildParser', () => {
  describe('extractChildEntries', () => {
    it('returns empty array when no child links exist', () => {
      const html = `
        <div>
          <p>Welcome to Wilma</p>
          <a href="/login">Login</a>
          <a href="/messages">Messages</a>
        </div>
      `;
      expect(ChildParser.extractChildEntries(html)).toEqual([]);
    });

    it('returns empty array for empty HTML', () => {
      expect(ChildParser.extractChildEntries('')).toEqual([]);
      expect(ChildParser.extractChildEntries('<html></html>')).toEqual([]);
    });

    it('extracts a single child from landing page', () => {
      const html = `
        <div class="dropdown-menu">
          <li role="presentation"><a href="/!04195821">Ilmari Huttunen</a></li>
        </div>
      `;
      const children = ChildParser.extractChildEntries(html);
      expect(children).toEqual([{ id: '04195821', name: 'Ilmari Huttunen' }]);
    });

    it('extracts two children from the current Wilma landing-page markup', () => {
      const html = `
        <div class="dropdown-menu">
          <li role="presentation"><a href="/!04195821">Ilmari Huttunen</a></li>
          <li role="presentation"><a href="/!04231428">Milo Huttunen</a></li>
        </div>
      `;

      const children = ChildParser.extractChildEntries(html);

      expect(children).toEqual([
        { id: '04195821', name: 'Ilmari Huttunen' },
        { id: '04231428', name: 'Milo Huttunen' }
      ]);
    });

    it('extracts three children from landing page', () => {
      const html = `
        <div>
          <a href="/!04195821">Ilmari Huttunen</a>
          <a href="/!04231428">Milo Huttunen</a>
          <a href="/!04567890">Aino Huttunen</a>
        </div>
      `;
      const children = ChildParser.extractChildEntries(html);
      expect(children).toHaveLength(3);
      expect(children[0].name).toBe('Ilmari Huttunen');
      expect(children[1].name).toBe('Milo Huttunen');
      expect(children[2].name).toBe('Aino Huttunen');
    });

    it('filters out navigation links that look like child links', () => {
      const html = `
        <div>
          <a href="/!04195821">Ilmari Huttunen</a>
          <a href="/!schedule">Schedule</a>
          <a href="/!messages">Viestit</a>
          <a href="/!exams">Exams</a>
          <a href="/!attendance">Attendance</a>
          <a href="/!news">News</a>
          <a href="/!lukujarjestys">Lukujärjestys</a>
        </div>
      `;
      const children = ChildParser.extractChildEntries(html);
      expect(children).toEqual([
        { id: '04195821', name: 'Ilmari Huttunen' }
      ]);
    });

    it('deduplicates by child ID, keeping the first occurrence with a name', () => {
      const html = `
        <div>
          <a href="/!04231428">Milo Huttunen</a>
          <a href="/!04231428/"><span class="hidden"></span></a>
          <a href="/!04231428/">Duplicate link</a>
        </div>
      `;
      const children = ChildParser.extractChildEntries(html);
      expect(children).toHaveLength(1);
      expect(children[0]).toEqual({ id: '04231428', name: 'Milo Huttunen' });
    });

    it('strips school and class tags from child name', () => {
      const html = `
        <h1>
          <a class="text-style-link" href="/!04231428/">
            Milo Huttunen <small>Ritaharjun koulu</small><span class="lem">, 2A</span>
          </a>
        </h1>
      `;
      const children = ChildParser.extractChildEntries(html);
      expect(children).toEqual([{ id: '04231428', name: 'Milo Huttunen' }]);
    });

    it('keeps non-lem spans in the name text', () => {
      const html = `
        <a href="/!04231428/">Milo <span class="highlight">Huttunen</span></a>
      `;
      const children = ChildParser.extractChildEntries(html);
      expect(children[0].name).toBe('Milo Huttunen');
    });
  });

  describe('extractChildSchoolAndClass', () => {
    it('returns nulls when no school/class info exists', () => {
      const html = `
        <a href="/!04195821">Ilmari Huttunen</a>
      `;
      const result = ChildParser.extractChildSchoolAndClass(html, '04195821');
      expect(result).toEqual({ schoolName: null, className: null });
    });

    it('extracts school name from small tag', () => {
      const html = `
        <h1>
          <a href="/!04231428/">
            Milo Huttunen <small>Ritaharjun koulu</small>
          </a>
        </h1>
      `;
      const result = ChildParser.extractChildSchoolAndClass(html, '04231428');
      expect(result).toEqual({ schoolName: 'Ritaharjun koulu', className: null });
    });

    it('extracts class name from span.lem tag', () => {
      const html = `
        <h1>
          <a href="/!04231428/">
            Milo Huttunen <span class="lem">, 2A</span>
          </a>
        </h1>
      `;
      const result = ChildParser.extractChildSchoolAndClass(html, '04231428');
      expect(result).toEqual({ schoolName: null, className: '2A' });
    });

    it('extracts both school and class name', () => {
      const html = `
        <h1>
          <a class="text-style-link" href="/!04231428/">
            Milo Huttunen <small>Ritaharjun koulu</small><span class="lem">, 2A</span>
          </a>
        </h1>
      `;
      const result = ChildParser.extractChildSchoolAndClass(html, '04231428');
      expect(result).toEqual({
        schoolName: 'Ritaharjun koulu',
        className: '2A'
      });
    });

    it('extracts class name without leading comma and space', () => {
      const html = `
        <a href="/!04231428/"><span class="lem">,    3B</span></a>
      `;
      const result = ChildParser.extractChildSchoolAndClass(html, '04231428');
      expect(result.className).toBe('3B');
    });

    it('matches only the correct child ID', () => {
      const html = `
        <a href="/!04195821/">Child 1 <small>School A</small><span class="lem">, 1A</span></a>
        <a href="/!04231428/">Child 2 <small>School B</small><span class="lem">, 2B</span></a>
      `;
      const result = ChildParser.extractChildSchoolAndClass(html, '04195821');
      expect(result).toEqual({ schoolName: 'School A', className: '1A' });
    });
  });

  describe('extractChildren (convenience method)', () => {
    it('returns empty array for empty HTML', () => {
      expect(ChildParser.extractChildren('')).toEqual([]);
    });

    it('returns empty array when no children found', () => {
      const html = '<div>No child links here</div>';
      expect(ChildParser.extractChildren(html)).toEqual([]);
    });

    it('combines entries with school and class for a single child', () => {
      const html = `
        <li><a href="/!04195821">Ilmari Huttunen</a></li>
        <h1><a href="/!04195821/">Ilmari Huttunen <small>Koulu</small><span class="lem">, 1A</span></a></h1>
      `;
      const children = ChildParser.extractChildren(html);
      expect(children).toEqual([{
        id: '04195821',
        name: 'Ilmari Huttunen',
        schoolName: 'Koulu',
        className: '1A'
      }]);
    });

    it('combines entries with school and class for two children', () => {
      const html = `
        <div class="dropdown-menu">
          <li role="presentation"><a href="/!04195821">Ilmari Huttunen</a></li>
          <li role="presentation"><a href="/!04231428">Milo Huttunen</a></li>
        </div>
      `;

      const children = ChildParser.extractChildren(html);
      expect(children).toHaveLength(2);
      expect(children[0].id).toBe('04195821');
      expect(children[0].name).toBe('Ilmari Huttunen');
      expect(children[1].id).toBe('04231428');
      expect(children[1].name).toBe('Milo Huttunen');
    });

    it('handles three children with mixed school/class info', () => {
      const html = `
        <li><a href="/!01">Alice</a></li>
        <li><a href="/!02">Bob</a></li>
        <li><a href="/!03">Charlie</a></li>
        <h1><a href="/!01/">Alice <small>Koulu A</small><span class="lem">, 3A</span></a></h1>
        <h1><a href="/!03/">Charlie <small>Koulu C</small><span class="lem">, 5B</span></a></h1>
      `;
      const children = ChildParser.extractChildren(html);
      expect(children).toHaveLength(3);
      expect(children[0]).toMatchObject({ id: '01', name: 'Alice', schoolName: 'Koulu A', className: '3A' });
      expect(children[1]).toMatchObject({ id: '02', name: 'Bob', schoolName: null, className: null });
      expect(children[2]).toMatchObject({ id: '03', name: 'Charlie', schoolName: 'Koulu C', className: '5B' });
    });
  });
});
