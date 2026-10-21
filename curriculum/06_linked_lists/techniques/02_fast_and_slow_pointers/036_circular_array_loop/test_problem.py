from solution import circular_array_loop


def test_circular_array_loop_forward_cycle():
    assert circular_array_loop([2, -1, 1, 2, 2])


def test_circular_array_loop_no_cycle_self_loop():
    assert not circular_array_loop([-1, 2])


def test_circular_array_loop_mixed_directions():
    assert not circular_array_loop([-2, 1, -1, -2, -2])


def test_circular_array_loop_single_element():
    assert not circular_array_loop([1])
