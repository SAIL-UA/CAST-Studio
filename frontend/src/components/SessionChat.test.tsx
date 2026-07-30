import { render, screen, fireEvent } from '@testing-library/react';
import SessionChat from './SessionChat';

jest.mock('../utils/userActionLogger', () => ({ logAction: jest.fn() }));

const baseProps = {
    messages: [],
    unreadCount: 0,
    onSend: jest.fn(() => true),
    onOpenChange: jest.fn(),
};

/** The drawer is always mounted; it opens by animating width from 0 to 288px. */
const drawer = (container: HTMLElement) =>
    container.querySelector('#session-chat > div:last-child') as HTMLElement;

describe('SessionChat toggle', () => {
    it('starts collapsed', () => {
        const { container } = render(<SessionChat {...baseProps} />);
        expect(drawer(container).className).toContain('w-0');
    });

    it('expands when the tab is clicked', () => {
        const { container } = render(<SessionChat {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: /chat/i }));
        expect(drawer(container).className).toContain('w-[288px]');
        expect(drawer(container).className).not.toContain('w-0');
    });

    it('collapses again on a second click', () => {
        const { container } = render(<SessionChat {...baseProps} />);
        const tab = screen.getByRole('button', { name: /chat/i });
        fireEvent.click(tab);
        fireEvent.click(tab);
        expect(drawer(container).className).toContain('w-0');
    });

    it('reports open state to the parent', () => {
        const onOpenChange = jest.fn();
        render(<SessionChat {...baseProps} onOpenChange={onOpenChange} />);
        fireEvent.click(screen.getByRole('button', { name: /chat/i }));
        expect(onOpenChange).toHaveBeenLastCalledWith(true);
    });

    it('sends a message and clears the draft', () => {
        const onSend = jest.fn(() => true);
        render(<SessionChat {...baseProps} onSend={onSend} />);
        fireEvent.click(screen.getByRole('button', { name: /chat/i }));

        const input = screen.getByLabelText('Chat message') as HTMLTextAreaElement;
        fireEvent.change(input, { target: { value: 'hello' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(onSend).toHaveBeenCalledWith('hello');
        expect(input.value).toBe('');
    });

    it('surfaces an error when the socket is closed', () => {
        render(<SessionChat {...baseProps} onSend={jest.fn(() => false)} />);
        fireEvent.click(screen.getByRole('button', { name: /chat/i }));

        const input = screen.getByLabelText('Chat message');
        fireEvent.change(input, { target: { value: 'hello' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(screen.getByText(/not connected/i)).toBeInTheDocument();
    });
});
