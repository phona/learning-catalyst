import React from 'react';
import { screen } from '@testing-library/react';
import { SyntaxHighlighterWrapper } from '../SyntaxHighlighterWrapper';
import { renderWithServices } from '@/test/utils/renderWithServices';

describe('SyntaxHighlighterWrapper', () => {
  it('renders code block with provided language and children', () => {
    renderWithServices(
      <SyntaxHighlighterWrapper language="typescript" showLineNumbers>
        {`const x: number = 1;`}
      </SyntaxHighlighterWrapper>,
    );

    expect(screen.getByText(/const x/)).toBeInTheDocument();
  });
});

