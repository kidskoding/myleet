from solution import video_stitching


def test_video_stitching_example_one():
    clips = [[0, 2], [4, 6], [8, 10], [1, 9], [1, 5], [5, 9]]
    assert video_stitching(clips, 10) == 3


def test_video_stitching_impossible_short():
    assert video_stitching([[0, 1], [1, 2]], 5) == -1


def test_video_stitching_many_clips():
    clips = [
        [0, 1],
        [6, 8],
        [0, 2],
        [5, 6],
        [0, 4],
        [0, 3],
        [6, 7],
        [1, 3],
        [4, 7],
        [1, 4],
        [2, 5],
        [2, 6],
        [3, 4],
        [4, 5],
        [5, 7],
        [6, 9],
    ]
    assert video_stitching(clips, 9) == 3


def test_video_stitching_single_clip_covers():
    assert video_stitching([[0, 5]], 3) == 1


def test_video_stitching_gap():
    assert video_stitching([[0, 2], [3, 5]], 5) == -1


def test_video_stitching_no_clip_at_zero():
    assert video_stitching([[1, 4], [2, 8]], 5) == -1
