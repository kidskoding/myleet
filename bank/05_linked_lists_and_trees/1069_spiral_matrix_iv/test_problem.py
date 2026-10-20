from list_node import ListNode
from solution import spiral_matrix


def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def test_spiral_matrix_example_one():
    head = build([3, 0, 2, 6, 8, 1, 7, 9, 4, 2, 5, 5, 0])
    assert spiral_matrix(3, 5, head) == [[3, 0, 2, 6, 8], [5, 0, -1, -1, 1], [5, 2, 4, 9, 7]]


def test_spiral_matrix_single_row():
    assert spiral_matrix(1, 4, build([0, 1, 2])) == [[0, 1, 2, -1]]


def test_spiral_matrix_single_cell():
    assert spiral_matrix(1, 1, build([5])) == [[5]]


def test_spiral_matrix_single_column():
    assert spiral_matrix(3, 1, build([1, 2])) == [[1], [2], [-1]]


def test_spiral_matrix_full_square():
    assert spiral_matrix(2, 2, build([1, 2, 3, 4])) == [[1, 2], [4, 3]]


def test_spiral_matrix_zero_values():
    assert spiral_matrix(2, 3, build([0, 0, 0, 0])) == [[0, 0, 0], [-1, -1, 0]]
