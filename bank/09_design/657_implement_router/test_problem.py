from solution import Router


def test_router_example_one():
    router = Router(3)
    assert router.add_packet(1, 4, 90) is True
    assert router.add_packet(2, 5, 90) is True
    assert router.add_packet(1, 4, 90) is False
    assert router.add_packet(3, 5, 95) is True
    assert router.add_packet(4, 5, 105) is True
    assert router.forward_packet() == [2, 5, 90]
    assert router.add_packet(5, 2, 110) is True
    assert router.get_count(5, 100, 110) == 1


def test_router_forward_until_empty():
    router = Router(2)
    assert router.add_packet(7, 4, 90) is True
    assert router.forward_packet() == [7, 4, 90]
    assert router.forward_packet() == []


def test_router_duplicate_allowed_after_forward():
    router = Router(2)
    assert router.add_packet(1, 2, 10) is True
    assert router.forward_packet() == [1, 2, 10]
    assert router.add_packet(1, 2, 10) is True


def test_router_eviction_drops_oldest():
    router = Router(2)
    router.add_packet(1, 9, 5)
    router.add_packet(2, 9, 6)
    router.add_packet(3, 9, 7)
    assert router.get_count(9, 1, 10) == 2
    assert router.get_count(9, 5, 5) == 0
    assert router.add_packet(3, 9, 7) is False
    assert router.forward_packet() == [2, 9, 6]
    assert router.forward_packet() == [3, 9, 7]


def test_router_counts_inclusive_range():
    router = Router(5)
    for src, ts in [(1, 10), (2, 20), (3, 20), (4, 30)]:
        router.add_packet(src, 7, ts)
    router.add_packet(5, 8, 30)
    assert router.get_count(7, 20, 30) == 3
    assert router.get_count(7, 11, 19) == 0
    assert router.get_count(8, 1, 100) == 1
    assert router.get_count(6, 1, 100) == 0
    router.forward_packet()
    assert router.get_count(7, 10, 10) == 0
