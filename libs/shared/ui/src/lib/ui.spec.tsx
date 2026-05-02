import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';
import { Input } from './input';
import { PasswordInput } from './password-input';
import { FormField } from './form-field';
import { Spinner } from './spinner';
import { Alert } from './alert';
import { Badge } from './badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Separator } from './separator';
import { TextLink } from './text-link';
import { PageHeader } from './page-header';
import { Avatar } from './avatar';

// ─── Button ─────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('is disabled while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards click handler', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant class', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('renders as disabled when disabled prop set', () => {
    render(<Button disabled>Locked</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

// ─── Input ───────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('applies error styling when error prop is set', () => {
    render(<Input error placeholder="bad" />);
    expect(screen.getByPlaceholderText('bad')).toHaveClass('border-red-500');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current?.tagName).toBe('INPUT');
  });
});

// ─── PasswordInput ────────────────────────────────────────────────────────────

describe('PasswordInput', () => {
  it('renders as password by default', () => {
    render(<PasswordInput placeholder="secret" />);
    expect(screen.getByPlaceholderText('secret')).toHaveAttribute('type', 'password');
  });

  it('toggles to text on eye button click', async () => {
    render(<PasswordInput placeholder="secret" />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await userEvent.click(toggle);
    expect(screen.getByPlaceholderText('secret')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('toggles back to password on second click', async () => {
    render(<PasswordInput placeholder="secret" />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByPlaceholderText('secret')).toHaveAttribute('type', 'password');
  });

  it('applies error styling', () => {
    render(<PasswordInput error placeholder="secret" />);
    expect(screen.getByPlaceholderText('secret')).toHaveClass('border-red-500');
  });
});

// ─── FormField ───────────────────────────────────────────────────────────────

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Invalid email">
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('shows hint text', () => {
    render(
      <FormField label="Password" htmlFor="pw" hint="Min 8 characters">
        <input id="pw" />
      </FormField>,
    );
    expect(screen.getByText('Min 8 characters')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <input id="email" />
      </FormField>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

// ─── Spinner ─────────────────────────────────────────────────────────────────

describe('Spinner', () => {
  it('renders with role status', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('applies animate-spin and ring classes', () => {
    render(<Spinner />);
    const el = screen.getByRole('status');
    expect(el).toHaveClass('animate-spin');
    expect(el).toHaveClass('rounded-full');
  });
});

// ─── Alert ───────────────────────────────────────────────────────────────────

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Something went wrong</Alert>);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Alert title="Error" variant="error">Details here</Alert>);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Details here')).toBeInTheDocument();
  });

  it('has role alert', () => {
    render(<Alert>Info</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it.each(['info', 'success', 'warning', 'error'] as const)(
    'renders %s variant without crashing',
    (variant) => {
      render(<Alert variant={variant}>message</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    },
  );
});

// ─── Badge ───────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it.each(['default', 'secondary', 'success', 'warning', 'destructive'] as const)(
    'renders %s variant',
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
    },
  );
});

// ─── Card ─────────────────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="my-custom">body</Card>);
    expect(container.querySelector('div')).toHaveClass('my-custom');
  });
});

// ─── Separator ───────────────────────────────────────────────────────────────

describe('Separator', () => {
  it('renders horizontal separator', () => {
    render(<Separator />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Separator label="or" />);
    expect(screen.getByText('or')).toBeInTheDocument();
  });
});

// ─── TextLink ─────────────────────────────────────────────────────────────────

describe('TextLink', () => {
  it('renders an anchor', () => {
    render(<TextLink href="/login">Log in</TextLink>);
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('passes through other props', () => {
    render(<TextLink href="#" target="_blank" rel="noopener noreferrer">External</TextLink>);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

// ─── PageHeader ──────────────────────────────────────────────────────────────

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders optional description', () => {
    render(<PageHeader title="Settings" description="Manage your account" />);
    expect(screen.getByText('Manage your account')).toBeInTheDocument();
  });

  it('renders optional action slot', () => {
    render(<PageHeader title="Users" action={<button>Add User</button>} />);
    expect(screen.getByRole('button', { name: 'Add User' })).toBeInTheDocument();
  });
});

// ─── Avatar ──────────────────────────────────────────────────────────────────

describe('Avatar', () => {
  it('renders initials when no src', () => {
    render(<Avatar name="Jane Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders two-char initials from single name', () => {
    render(<Avatar name="Zara" />);
    expect(screen.getByText('ZA')).toBeInTheDocument();
  });

  it('renders img when src provided', () => {
    render(<Avatar src="https://example.com/pic.jpg" name="Jane" />);
    expect(screen.getByRole('img', { name: 'Jane' })).toHaveAttribute(
      'src',
      'https://example.com/pic.jpg',
    );
  });

  it('falls back to ? when no name or src', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
