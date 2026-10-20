from list_node import ListNode
from solution import remove_elements


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_remove_elements_removes_matches():
    head = build_list([1, 2, 6, 3, 4, 5, 6])
    assert to_list(remove_elements(head, 6)) == [1, 2, 3, 4, 5]


def test_remove_elements_all_match():
    assert remove_elements(build_list([7, 7, 7]), 7) is None
