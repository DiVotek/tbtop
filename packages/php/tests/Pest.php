<?php

use Tbtop\Admin\Tests\HttpTestCase;
use Tbtop\Admin\Tests\TestCase;

uses(HttpTestCase::class)->in('PageHttpTest.php', 'TableHttpTest.php', 'UploadHttpTest.php', 'LocaleHttpTest.php', 'TranslatableTableTest.php');
uses(TestCase::class)->in('DslSerializationTest.php', 'RuleCollectionTest.php', 'NavBuilderTest.php', 'ContractTest.php', 'ArchTest.php', 'ExampleTest.php', 'TranslatableFieldTest.php', 'RichtextFieldTest.php', 'CondTest.php', 'CondFieldBuilderTest.php', 'FieldKindParityTest.php', 'FieldTypedModifiersTest.php', 'FieldRegistryTest.php');
