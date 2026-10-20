from solution import RangeModule


def test_range_module_add_and_query():
    module = RangeModule()
    module.add_range(10, 20)
    assert module.query_range(10, 14) is True
    assert module.query_range(13, 21) is False


def test_range_module_remove_range():
    module = RangeModule()
    module.add_range(10, 20)
    module.remove_range(14, 16)
    assert module.query_range(10, 14) is True
    assert module.query_range(13, 17) is False
    assert module.query_range(16, 20) is True


def test_range_module_query_empty():
    module = RangeModule()
    assert module.query_range(1, 5) is False
