import { Component, ElementRef, ViewChild } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeToggleButtonComponent } from '../../components/common/theme-toggle/theme-toggle-button.component';
import { NotificationDropdownComponent } from '../../components/header/notification-dropdown/notification-dropdown.component';
import { UserDropdownComponent } from '../../components/header/user-dropdown/user-dropdown.component';
import { IconComponent } from '../../components/ui/icon/icon.component';
import { MAIN_NAV_ITEMS, NavItem, NavSubItem } from '../app-sidebar/sidebar-menu.config';

type SearchMenuOption = {
  name: string;
  path: string;
  section: string;
};

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleButtonComponent,
    NotificationDropdownComponent,
    UserDropdownComponent,
    IconComponent,
  ],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  isApplicationMenuOpen = false;
  readonly isMobileOpen$;
  searchTerm = '';
  isSearchDropdownOpen = false;
  readonly searchOptions: SearchMenuOption[] = this.buildSearchOptions();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(
    public sidebarService: SidebarService,
    private readonly router: Router,
  ) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu() {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  ngAfterViewInit() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
      this.isSearchDropdownOpen = true;
    }
  };

  onSearchFocus() {
    this.isSearchDropdownOpen = true;
  }

  onSearchInput(value: string) {
    this.searchTerm = value;
    this.isSearchDropdownOpen = true;
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isSearchDropdownOpen = false;
    }, 120);
  }

  get filteredSearchOptions(): SearchMenuOption[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return this.searchOptions.slice(0, 10);
    return this.searchOptions
      .filter((option) =>
        `${option.section} ${option.name}`.toLowerCase().includes(query),
      )
      .slice(0, 12);
  }

  navigateToOption(path: string) {
    this.router.navigateByUrl(path);
    this.searchTerm = '';
    this.isSearchDropdownOpen = false;
  }

  onSearchEnter() {
    const firstResult = this.filteredSearchOptions[0];
    if (!firstResult) return;
    this.navigateToOption(firstResult.path);
  }

  private buildSearchOptions(): SearchMenuOption[] {
    const options: SearchMenuOption[] = [];
    MAIN_NAV_ITEMS.forEach((item) => this.flattenMenuItem(item, options, []));
    return options;
  }

  private flattenMenuItem(
    item: NavItem | NavSubItem,
    bucket: SearchMenuOption[],
    parents: string[],
  ) {
    const currentParents = [...parents, item.name];
    if (item.path) {
      bucket.push({
        name: item.name,
        path: item.path,
        section: parents.join(' / ') || item.name,
      });
    }
    (item.subItems ?? []).forEach((subItem) =>
      this.flattenMenuItem(subItem, bucket, currentParents),
    );
  }
}
