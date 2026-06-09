<?php

use Tbtop\Admin\Tests\HttpTestCase;
use Tbtop\Admin\Tests\TestCase;

uses(HttpTestCase::class)->in('PageHttpTest.php', 'TableHttpTest.php');
uses(TestCase::class)->in('DslSerializationTest.php', 'RuleCollectionTest.php', 'NavBuilderTest.php', 'ArchTest.php', 'ExampleTest.php');
