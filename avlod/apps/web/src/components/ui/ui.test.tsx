import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './Dialog';
import { Input } from './Field';
import { validateFile } from '../../features/memories/MemoryForm';

describe('ConfirmDialog', () => {
  it('is an accessible modal that requires an explicit confirmation', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        title="O‘chirasizmi?"
        message="Bu amalni qaytarib bo‘lmaydi."
        confirmLabel="O‘chirish"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'O‘chirasizmi?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Focus starts on the safe action, not the destructive one.
    expect(screen.getByRole('button', { name: 'Bekor qilish' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'O‘chirish' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('Input', () => {
  it('links label and error message to the control', () => {
    render(<Input label="Ism" error="Ismni kiriting" />);
    const input = screen.getByLabelText('Ism');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Ismni kiriting');
    expect(screen.getByRole('alert')).toHaveTextContent('Ismni kiriting');
  });
});

describe('validateFile', () => {
  const file = (type: string, size: number) => {
    const f = new File(['x'], 'f', { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };
  it('accepts supported media within limits and rejects the rest', () => {
    expect(validateFile(file('image/jpeg', 1_000))).toBeNull();
    expect(validateFile(file('video/mp4', 50 * 1024 * 1024))).toBeNull();
    expect(validateFile(file('image/svg+xml', 1_000))).toMatch(/Faqat/);
    expect(validateFile(file('image/png', 25 * 1024 * 1024))).toMatch(/20 MB/);
  });
});
