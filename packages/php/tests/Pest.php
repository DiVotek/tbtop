<?php

use Tbtop\Admin\Tests\HttpTestCase;
use Tbtop\Admin\Tests\TestCase;

uses(HttpTestCase::class)->in('PageHttpTest.php', 'TableHttpTest.php', 'UploadHttpTest.php', 'LocaleHttpTest.php', 'TranslatableTableTest.php', 'TableFilterTest.php', 'InFilterTest.php', 'BreadcrumbsHttpTest.php', 'SharedPropsTest.php', 'PanelRootRedirectTest.php');
uses(TestCase::class)->in('DslSerializationTest.php', 'RuleCollectionTest.php', 'FluentValidationRulesTest.php', 'NavBuilderTest.php', 'ContractTest.php', 'ChromeTest.php', 'ArchTest.php', 'ExampleTest.php', 'TranslatableFieldTest.php', 'RichtextFieldTest.php', 'CondTest.php', 'CondFieldBuilderTest.php', 'FieldKindParityTest.php', 'FieldTypedModifiersTest.php', 'FieldRegistryTest.php', 'TableFilterSerializationTest.php', 'DaterangeFieldTest.php', 'LayoutNodeTest.php', 'SelectCreatableTest.php', 'ColumnDslTest.php', 'FormBuilderTest.php', 'BreadcrumbsTest.php', 'MediaSsrfGuardTest.php', 'MediaSvgSanitizerTest.php', 'ImageEncoderTest.php', 'TableTabsDslTest.php', 'UploadFieldConfigTest.php', 'TranslatableModelProjectionTest.php', 'NotificationBuilderTest.php', 'NotificationProjectionTest.php', 'RelationColumnProjectionTest.php', 'ActionPolishTest.php', 'TableEmbeddedDslTest.php', 'TableToolbarDslTest.php');

use Tbtop\Admin\Tests\ColumnProjectionHttpTestCase;
use Tbtop\Admin\Tests\HeaderActionsHttpTestCase;
use Tbtop\Admin\Tests\MediaHttpTestCase;
use Tbtop\Admin\Tests\NotificationsHttpTestCase;
use Tbtop\Admin\Tests\PageLayoutHttpTestCase;
use Tbtop\Admin\Tests\PanelsHttpTestCase;
use Tbtop\Admin\Tests\RunsMigrationsTestCase;
use Tbtop\Admin\Tests\TableTabsHttpTestCase;

uses(ColumnProjectionHttpTestCase::class)->in('ColumnProjectionTest.php');
uses(TableTabsHttpTestCase::class)->in('TableTabsHttpTest.php');
uses(MediaHttpTestCase::class)->in('MediaHttpTest.php');
uses(PageLayoutHttpTestCase::class)->in('PageLayoutTest.php');
uses(RunsMigrationsTestCase::class)->in('PackageMigrationsTest.php');
uses(PanelsHttpTestCase::class)->in('PanelsHttpTest.php');
uses(NotificationsHttpTestCase::class)->in('NotificationsHttpTest.php');
uses(HeaderActionsHttpTestCase::class)->in('HeaderActionsHttpTest.php');

use Tbtop\Admin\Pages\Page;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelConfig;

/**
 * A request-scoped panel for unit tests of builders that read CurrentPanel.
 *
 * @param  list<class-string<Page>>  $pages
 */
function panelWithPages(array $pages): CurrentPanel
{
    return new CurrentPanel((new PanelConfig)->id('admin')->prefix('admin')->pages($pages));
}

/** A request-scoped panel with an optional chrome class override. */
function panelWithChrome(?string $chrome): CurrentPanel
{
    $config = (new PanelConfig)->id('admin')->prefix('admin');
    if ($chrome !== null) {
        $config->chrome($chrome);
    }

    return new CurrentPanel($config);
}
