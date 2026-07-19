import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { UserList } from '@/components/room/UserList';

// Mock the global socket
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
const mockSocketEmit = vi.fn();

const mockSocket = {
  on: mockSocketOn,
  off: mockSocketOff,
  emit: mockSocketEmit,
  connected: true,
};

const mockSubscribeCachedRoomUsers = vi.fn();
const mockUnsubscribeCachedRoomUsers = vi.fn();

vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({ socket: mockSocket }),
  getCachedRoomUsers: () => [],
  subscribeCachedRoomUsers: (...args: unknown[]) => mockSubscribeCachedRoomUsers(...args),
}));

// Mock PokemonThemeProvider to avoid context errors
vi.mock('@/components/PokemonThemeProvider', () => ({
  usePokemonTheme: () => ({ theme: 'default' }),
}));

// Mock the Next/Image component to avoid errors
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || 'mock image'} />;
  },
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Users: () => <div data-testid="icon-users" />,
  UserPlus: () => <div data-testid="icon-userplus" />,
  Shield: () => <div data-testid="icon-shield" />,
  ShieldOff: () => <div data-testid="icon-shield-off" />,
  Crown: () => <div data-testid="icon-crown" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
}));

describe('UserList Component Listener Stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeCachedRoomUsers.mockImplementation((_roomId, listener) => {
      listener([]);
      return mockUnsubscribeCachedRoomUsers;
    });
  });

  it('should update from the shared room-user cache without re-binding socket listeners', () => {
    const { rerender } = render(<UserList socket={mockSocket as any} roomId="test-room" hostId="host-1" />);

    expect(mockSubscribeCachedRoomUsers).toHaveBeenCalledWith('test-room', expect.any(Function));
    expect(mockSocketOn).toHaveBeenCalledWith('connect', expect.any(Function));

    const cacheUpdateCallback = mockSubscribeCachedRoomUsers.mock.calls[0]?.[1];
    expect(cacheUpdateCallback).toBeDefined();

    mockSocketOn.mockClear();
    mockSocketOff.mockClear();

    act(() => {
      cacheUpdateCallback([
        { id: 'user-1', name: 'User 1', socketId: 'socket-1' },
        { id: 'user-2', name: 'User 2', socketId: 'socket-2' },
      ]);
    });

    expect(screen.getByText('2 Online')).toBeInTheDocument();
    expect(mockSocketOn).not.toHaveBeenCalled();
    expect(mockSocketOff).not.toHaveBeenCalled();

    rerender(<UserList socket={mockSocket as any} roomId="test-room" hostId="host-1" />);

    expect(mockSocketOn).not.toHaveBeenCalled();
    expect(mockSocketOff).not.toHaveBeenCalled();
    expect(mockUnsubscribeCachedRoomUsers).not.toHaveBeenCalled();
  });
});
