import { fileGlyph, formatFileSize, sandboxFileName, validateFile } from '../logic';

describe('validateFile', () => {
  it('requires a name', () => {
    expect(validateFile({ name: '', sandboxUri: 'file:///a', category: 'other' }))
      .toEqual({ ok: false, error: 'Name required' });
  });
  it('requires a chosen file', () => {
    expect(validateFile({ name: 'a.pdf', sandboxUri: '', category: 'other' }))
      .toEqual({ ok: false, error: 'No file chosen' });
  });
  it('requires a valid category', () => {
    expect(validateFile({ name: 'a.pdf', sandboxUri: 'file:///a', category: 'bogus' }))
      .toEqual({ ok: false, error: 'Invalid category' });
  });
  it('accepts a well-formed draft', () => {
    expect(validateFile({ name: 'a.pdf', sandboxUri: 'file:///a', category: 'materials' }))
      .toEqual({ ok: true });
  });
});

describe('formatFileSize', () => {
  it('formats bytes under 1KB', () => { expect(formatFileSize(512)).toBe('512 B'); });
  it('formats kilobytes', () => { expect(formatFileSize(2048)).toBe('2.0 KB'); });
  it('formats megabytes with one decimal under 10', () => { expect(formatFileSize(1_572_864)).toBe('1.5 MB'); });
  it('formats megabytes with no decimal at 10+', () => { expect(formatFileSize(12 * 1024 * 1024)).toBe('12 MB'); });
  it('clamps negative/invalid input to 0 B', () => {
    expect(formatFileSize(-5)).toBe('0 B');
    expect(formatFileSize(NaN)).toBe('0 B');
  });
});

describe('fileGlyph', () => {
  it('picks a glyph by extension', () => {
    expect(fileGlyph('notes.pdf')).toBe('▤');
    expect(fileGlyph('photo.PNG')).toBe('▨');
  });
  it('falls back for unknown extensions', () => {
    expect(fileGlyph('mystery.xyz')).toBe('▤');
  });
});

describe('sandboxFileName', () => {
  it('keeps the extension and swaps the stem for the id', () => {
    expect(sandboxFileName('abc-123', 'My Homework.docx')).toBe('abc-123.docx');
  });
  it('handles names with no extension', () => {
    expect(sandboxFileName('abc-123', 'README')).toBe('abc-123');
  });
});
