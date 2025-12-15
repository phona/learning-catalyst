import React from 'react';
import { render, screen } from '@testing-library/react';
import { SyntaxHighlighterWrapper } from '../SyntaxHighlighterWrapper';

describe('SyntaxHighlighterWrapper', () => {
  it('renders code block with provided language and children', () => {
    render(
      <SyntaxHighlighterWrapper language="typescript" showLineNumbers>
        {`const x: number = 1;`}
      </SyntaxHighlighterWrapper>,
    );

    expect(screen.getByText(/const x/)).toBeInTheDocument();
  });
});

