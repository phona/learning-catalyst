import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Container } from './Container';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      data-testid="confirm-dialog"
    >
      <Container maxWidth="sm">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle id="confirm-dialog-title">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p id="confirm-dialog-description" className="text-gray-700 dark:text-gray-300">
              {message}
            </p>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 pt-6">
            <Button variant="secondary" onClick={onCancel} data-testid="confirm-dialog-cancel">
              {cancelText}
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              data-testid="confirm-dialog-confirm"
              autoFocus
            >
              {confirmText}
            </Button>
          </CardFooter>
        </Card>
      </Container>
    </div>
  );
};
