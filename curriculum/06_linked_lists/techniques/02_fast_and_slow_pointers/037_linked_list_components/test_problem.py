from list_node import ListNode
from solution import num_components


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def test_num_components_two_runs():
    assert num_components(build_list([0, 1, 2, 3]), [0, 1, 3]) == 2


def test_num_components_single_run():
    assert num_components(build_list([0, 1, 2, 3, 4]), [0, 3, 1, 4]) == 2


def test_num_components_all_selected():
    assert num_components(build_list([1, 2, 3]), [1, 2, 3]) == 1


def test_num_components_none_selected():
    assert num_components(build_list([1, 2, 3]), []) == 0
