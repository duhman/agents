import { describe, it, expect } from '@jest/globals';
import { 
  detectCancellationIntentEnhanced, 
  isNonCancellationEmail,
  analyzeEmailStructure 
} from '../../../packages/prompts/src/patterns.js';

describe('Email Classification', () => {
  describe('Non-Cancellation Detection', () => {
    it('should detect feedback request emails', () => {
      const email = 'Subject: How would you rate the received customer service?\n\nInquiry # 493729';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });
    
    it('should detect general question emails', () => {
      const email = 'Subject: How do I update my payment information?\n\nI need help updating my card.';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });
    
    it('should detect support request emails', () => {
      const email = 'Subject: App not working\n\nI cannot access the charging station.';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });

    it('should detect rating/survey emails', () => {
      const email = 'Subject: Rate our service\n\nPlease rate your experience with our customer service.';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });

    it('should detect inquiry emails', () => {
      const email = 'Subject: Inquiry # 12345\n\nHow can I contact support?';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });
  });
  
  describe('Cancellation Detection', () => {
    it('should detect clear cancellation requests', () => {
      const email = 'Subject: Cancellation request\n\nI am moving and want to cancel my subscription.';
      expect(isNonCancellationEmail(email)).toBe(false);
      expect(detectCancellationIntentEnhanced(email)).toBe(true);
    });
    
    it('should detect Norwegian cancellation requests', () => {
      const email = 'Subject: Oppsigelse\n\nJeg skal flytte og ønsker å si opp abonnementet mitt.';
      expect(detectCancellationIntentEnhanced(email)).toBe(true);
    });

    it('should detect English cancellation requests', () => {
      const email = 'Subject: Cancel subscription\n\nI need to cancel my subscription because I am moving.';
      expect(detectCancellationIntentEnhanced(email)).toBe(true);
    });

    it('should detect cancellation in body even with neutral subject', () => {
      const email = 'Subject: Question about my account\n\nI am moving and would like to cancel my subscription.';
      expect(detectCancellationIntentEnhanced(email)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should not detect cancellation for questions about cancellation process', () => {
      const email = 'Subject: How do I cancel my subscription?\n\nI want to know the process for canceling.';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });

    it('should detect cancellation when moving is mentioned with cancel intent', () => {
      const email = 'Subject: Moving\n\nI am moving and need to cancel my subscription.';
      expect(detectCancellationIntentEnhanced(email)).toBe(true);
    });

    it('should not detect cancellation for general moving questions', () => {
      const email = 'Subject: Moving to new address\n\nHow do I update my address in the app?';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });
  });

  describe('Email Structure Analysis', () => {
    it('should properly parse subject and body', () => {
      const email = 'Subject: Test Subject\n\nThis is the email body content.';
      const result = analyzeEmailStructure(email);
      
      expect(result.subject).toBe('Test Subject');
      expect(result.body).toBe('This is the email body content.');
      expect(result.hasSubject).toBe(true);
    });

    it('should handle emails without subject line', () => {
      const email = 'This is just the email body without a subject line.';
      const result = analyzeEmailStructure(email);
      
      expect(result.subject).toBe('This is just the email body without a subject line.');
      expect(result.body).toBe('This is just the email body without a subject line.');
      expect(result.hasSubject).toBe(false);
    });

    it('should handle case-insensitive subject parsing', () => {
      const email = 'subject: Test Subject\n\nThis is the email body content.';
      const result = analyzeEmailStructure(email);
      
      expect(result.subject).toBe('Test Subject');
      expect(result.body).toBe('This is the email body content.');
      expect(result.hasSubject).toBe(true);
    });
  });

  describe('Real-world Examples', () => {
    it('should handle the exact case from the screenshot', () => {
      const email = 'Subject: Inquiry # 493729: How would you rate the received customer service?\n\nInquiry # 493729: How would you rate the received customer service?';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });

    it('should handle Norwegian feedback requests', () => {
      const email = 'Subject: Vurdering av kundeservice\n\nHvordan vil du vurdere den mottatte kundeservicen?';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });

    it('should handle Swedish feedback requests', () => {
      const email = 'Subject: Betygsätt vår service\n\nHur skulle du betygsätta den mottagna kundservicen?';
      expect(isNonCancellationEmail(email)).toBe(true);
      expect(detectCancellationIntentEnhanced(email)).toBe(false);
    });
  });
});
