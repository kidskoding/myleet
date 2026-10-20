from solution import sort_the_students


def test_sort_the_students_example_one():
    score = [[10, 6, 9, 1], [7, 5, 11, 2], [4, 8, 3, 15]]
    assert sort_the_students(score, 2) == [[7, 5, 11, 2], [10, 6, 9, 1], [4, 8, 3, 15]]


def test_sort_the_students_example_two():
    assert sort_the_students([[3, 4], [5, 6]], 0) == [[5, 6], [3, 4]]


def test_sort_the_students_single_student():
    assert sort_the_students([[1, 2, 3]], 1) == [[1, 2, 3]]


def test_sort_the_students_single_exam():
    assert sort_the_students([[2], [9], [5]], 0) == [[9], [5], [2]]


def test_sort_the_students_last_column():
    assert sort_the_students([[1, 30], [2, 10], [3, 20]], 1) == [[1, 30], [3, 20], [2, 10]]
