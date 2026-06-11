<?php

use Tbtop\Admin\Tests\HttpTestCase;
use Tbtop\Admin\Tests\TestCase;

uses(HttpTestCase::class)->in('PageHttpTest.php', 'TableHttpTest.php', 'UploadHttpTest.php', 'LocaleHttpTest.php', 'TranslatableTableTest.php', 'TableFilterTest.php', 'BreadcrumbsHttpTest.php', 'SharedPropsTest.php');
uses(TestCase::class)->in('DslSerializationTest.php', 'RuleCollectionTest.php', 'NavBuilderTest.php', 'ContractTest.php', 'ArchTest.php', 'ExampleTest.php', 'TranslatableFieldTest.php', 'RichtextFieldTest.php', 'CondTest.php', 'CondFieldBuilderTest.php', 'FieldKindParityTest.php', 'FieldTypedModifiersTest.php', 'FieldRegistryTest.php', 'TableFilterSerializationTest.php', 'DaterangeFieldTest.php', 'LayoutNodeTest.php', 'SelectCreatableTest.php', 'ColumnDslTest.php', 'FormBuilderTest.php', 'BreadcrumbsTest.php', 'MediaSsrfGuardTest.php');

use Tbtop\Admin\Tests\ColumnProjectionHttpTestCase;
use Tbtop\Admin\Tests\MediaHttpTestCase;
use Tbtop\Admin\Tests\PageLayoutHttpTestCase;
use Tbtop\Admin\Tests\PanelsHttpTestCase;
use Tbtop\Admin\Tests\RunsMigrationsTestCase;

uses(ColumnProjectionHttpTestCase::class)->in('ColumnProjectionTest.php');
uses(MediaHttpTestCase::class)->in('MediaHttpTest.php');
uses(PageLayoutHttpTestCase::class)->in('PageLayoutTest.php');
uses(RunsMigrationsTestCase::class)->in('PackageMigrationsTest.php');
uses(PanelsHttpTestCase::class)->in('PanelsHttpTest.php');

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
