from solution import can_complete_circuit


def test_can_complete_circuit_solvable():
    assert can_complete_circuit([1, 2, 3, 4, 5], [3, 4, 5, 1, 2]) == 3


def test_can_complete_circuit_impossible():
    assert can_complete_circuit([2, 3, 4], [3, 4, 3]) == -1


def test_can_complete_circuit_single_station():
    assert can_complete_circuit([5], [4]) == 0


def test_can_complete_circuit_empty():
    assert can_complete_circuit([], []) == -1
