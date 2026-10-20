from solution import Allocator


def test_allocator_example():
    loc = Allocator(10)
    assert loc.allocate(1, 1) == 0
    assert loc.allocate(1, 2) == 1
    assert loc.allocate(1, 3) == 2
    assert loc.free_memory(2) == 1
    assert loc.allocate(3, 4) == 3
    assert loc.allocate(1, 1) == 1
    assert loc.allocate(1, 1) == 6
    assert loc.free_memory(1) == 3
    assert loc.allocate(10, 2) == -1
    assert loc.free_memory(7) == 0


def test_allocator_exact_fit():
    loc = Allocator(4)
    assert loc.allocate(4, 1) == 0
    assert loc.allocate(1, 2) == -1
    assert loc.free_memory(1) == 4
    assert loc.allocate(1, 2) == 0


def test_allocator_gap_too_small():
    loc = Allocator(5)
    assert loc.allocate(2, 1) == 0
    assert loc.allocate(1, 2) == 2
    assert loc.allocate(2, 3) == 3
    assert loc.free_memory(2) == 1
    assert loc.allocate(2, 4) == -1
    assert loc.allocate(1, 4) == 2
    assert loc.free_memory(1) == 2
    assert loc.allocate(3, 5) == -1


def test_allocator_frees_all_blocks_of_an_id():
    loc = Allocator(6)
    assert loc.allocate(2, 7) == 0
    assert loc.allocate(1, 8) == 2
    assert loc.allocate(2, 7) == 3
    assert loc.free_memory(7) == 4
    assert loc.allocate(3, 9) == 3


def test_allocator_free_unknown_id():
    loc = Allocator(1)
    assert loc.free_memory(1) == 0
    assert loc.allocate(1, 1) == 0
    assert loc.free_memory(1) == 1
