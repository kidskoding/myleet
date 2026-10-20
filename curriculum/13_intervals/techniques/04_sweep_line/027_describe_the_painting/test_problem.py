from solution import split_painting


def test_split_painting_overlapping_segments():
    assert split_painting([[1, 4, 5], [4, 7, 7], [1, 7, 9]]) == [[1, 4, 14], [4, 7, 16]]


def test_split_painting_partial_overlap():
    segments = [[1, 7, 9], [6, 8, 15], [8, 10, 7]]
    assert split_painting(segments) == [[1, 6, 9], [6, 7, 24], [7, 8, 15], [8, 10, 7]]
