import { Page, ElementHandle } from 'puppeteer';
import { PaginationNavigator } from '../PaginationNavigator';

describe('PaginationNavigator', () => {
  let navigator: PaginationNavigator;
  let mockPage: jest.Mocked<Page>;
  let mockElementHandle: jest.Mocked<ElementHandle>;

  beforeEach(() => {
    navigator = new PaginationNavigator();
    mockElementHandle = {
      click: jest.fn().mockResolvedValue(undefined),
      // Add other ElementHandle methods that might be called
    } as unknown as jest.Mocked<ElementHandle>;

    mockPage = {
      $: jest.fn().mockResolvedValue(mockElementHandle), // Mock for page.$(selector)
      waitForNavigation: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(undefined),
      // Add other Page methods that might be called
    } as unknown as jest.Mocked<Page>;
  });

  it('should navigate to the next page for numbered pagination', async () => {
    const paginationDetails = { selector: '.pagination a', type: 'numbered' } as const;
    const result = await navigator.navigateNext(mockPage, paginationDetails);

    expect(result).toBe(true);
    expect(mockPage.$).toHaveBeenCalledWith(paginationDetails.selector);
    expect(mockElementHandle.click).toHaveBeenCalled();
    expect(mockPage.waitForNavigation).toHaveBeenCalled();
  });

  it('should navigate to the next page for next-prev pagination', async () => {
    const paginationDetails = { selector: 'a.next', type: 'next-prev' } as const;
    const result = await navigator.navigateNext(mockPage, paginationDetails);

    expect(result).toBe(true);
    expect(mockPage.$).toHaveBeenCalledWith(paginationDetails.selector);
    expect(mockElementHandle.click).toHaveBeenCalled();
    expect(mockPage.waitForNavigation).toHaveBeenCalled();
  });

  it('should navigate to the next page for load-more pagination', async () => {
    const paginationDetails = { selector: '.load-more', type: 'load-more' } as const;
    const result = await navigator.navigateNext(mockPage, paginationDetails);

    expect(result).toBe(true);
    expect(mockPage.$).toHaveBeenCalledWith(paginationDetails.selector);
    expect(mockElementHandle.click).toHaveBeenCalled();
    expect(mockPage.waitForNavigation).toHaveBeenCalled();
  });

  it('should return false if element is not found for click-based pagination', async () => {
    mockPage.$.mockResolvedValue(null); // Element not found
    const paginationDetails = { selector: '.non-existent', type: 'numbered' } as const;
    const result = await navigator.navigateNext(mockPage, paginationDetails);

    expect(result).toBe(false);
    expect(mockPage.$).toHaveBeenCalledWith(paginationDetails.selector);
    expect(mockElementHandle.click).not.toHaveBeenCalled();
    expect(mockPage.waitForNavigation).not.toHaveBeenCalled();
  });

  it('should return false for infinite-scroll type as it is handled externally', async () => {
    const paginationDetails = { selector: 'body', type: 'infinite-scroll' } as const;
    const result = await navigator.navigateNext(mockPage, paginationDetails);

    expect(result).toBe(false);
    expect(mockPage.$).not.toHaveBeenCalled();
    expect(mockElementHandle.click).not.toHaveBeenCalled();
    expect(mockPage.waitForNavigation).not.toHaveBeenCalled();
  });

  it('should navigate to a given URL', async () => {
    const url = 'https://example.com/page/2';
    const result = await navigator.navigateToUrl(mockPage, url);

    expect(result).toBe(true);
    expect(mockPage.goto).toHaveBeenCalledWith(url);
    expect(mockPage.waitForNavigation).toHaveBeenCalled();
  });

  it('should return false if navigation to URL fails', async () => {
    const url = 'https://example.com/page/2';
    mockPage.goto.mockRejectedValue(new Error('Navigation failed')); // Simulate navigation failure
    const result = await navigator.navigateToUrl(mockPage, url);

    expect(result).toBe(false);
    expect(mockPage.goto).toHaveBeenCalledWith(url);
    expect(mockPage.waitForNavigation).toHaveBeenCalled();
  });
});