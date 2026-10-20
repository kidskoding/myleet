from solution import MapSum


def test_map_sum_single_key():
    map_sum = MapSum()
    map_sum.insert("apple", 3)
    assert map_sum.sum("ap") == 3
    assert map_sum.sum("apple") == 3
    assert map_sum.sum("b") == 0


def test_map_sum_overwrite_key():
    map_sum = MapSum()
    map_sum.insert("apple", 3)
    map_sum.insert("app", 2)
    assert map_sum.sum("ap") == 5
    map_sum.insert("apple", 10)
    assert map_sum.sum("ap") == 12
