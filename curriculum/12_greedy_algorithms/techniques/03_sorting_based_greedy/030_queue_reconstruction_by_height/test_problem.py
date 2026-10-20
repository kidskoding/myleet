from solution import reconstruct_queue


def test_reconstruct_queue_normal():
    people = [[7, 0], [4, 4], [7, 1], [5, 0], [6, 1], [5, 2]]
    expected = [[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]]
    assert reconstruct_queue(people) == expected


def test_reconstruct_queue_single_person():
    assert reconstruct_queue([[6, 0]]) == [[6, 0]]


def test_reconstruct_queue_empty():
    assert reconstruct_queue([]) == []
